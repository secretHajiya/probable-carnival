const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();
const MIN_NAIRA_POINTS = 200000;
const MIN_USD_POINTS = 300000;
const USD_METHODS = new Set(['PayPal (USD)', 'USDT']);
const NAIRA_METHODS = new Set(['Bank Transfer', 'Opay', 'Palmpay', 'Moniepoint', 'Kuda', 'Airtime']);

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'Da fatan za a shiga account ɗinka.');
  }
  return request.auth.uid;
}

exports.initializeUserProfile = onCall(async (request) => {
  const uid = requireAuth(request);
  const name = typeof request.data?.name === 'string' ? request.data.name.trim().slice(0, 80) : '';
  const email = request.auth.token.email || '';
  if (!name || !email) throw new HttpsError('invalid-argument', 'Suna da email suna da muhimmanci.');
  const ref = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.create(ref, {
        name, email, balance: 0, totalTaps: 0, tapProgress: 0, bonus: 0,
        globalId: `VYRAGJVOP1-${uid.slice(0, 6)}`,
        hiddenAppId: '37222', createdAt: FieldValue.serverTimestamp()
      });
    }
  });
  return { ok: true };
});

exports.claimTapReward = onCall(async (request) => {
  const uid = requireAuth(request);
  const ref = db.doc(`users/${uid}`);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('failed-precondition', 'Ba a sami bayanan account ba. Sake shiga.');
    const data = snap.data();
    const progress = Number.isInteger(data.tapProgress) ? data.tapProgress : 0;
    const balance = Number.isInteger(data.balance) ? data.balance : 0;
    const totalTaps = Number.isInteger(data.totalTaps) ? data.totalTaps : 0;
    const bonus = Number.isInteger(data.bonus) ? data.bonus : 0;
    const lastTapAt = data.lastTapAt && typeof data.lastTapAt.toMillis === 'function' ? data.lastTapAt.toMillis() : 0;
    if (lastTapAt && Date.now() - lastTapAt < 400) throw new HttpsError('resource-exhausted', 'Ka yi saurin tap sosai. Jira kaɗan ka sake gwadawa.');
    if (progress >= 150) throw new HttpsError('failed-precondition', 'Ka kai tap 150. Kammala tsarin bonus na talla kafin ka ci gaba.');
    const next = { balance: balance + 10, totalTaps: totalTaps + 1, tapProgress: progress + 1, bonus };
    tx.update(ref, { ...next, lastTapAt: FieldValue.serverTimestamp() });
    return next;
  });
  return { ok: true, reward: 10, ...result };
});

exports.createWithdrawalRequest = onCall(async (request) => {
  const uid = requireAuth(request);
  const method = typeof request.data?.method === 'string' ? request.data.method : '';
  const network = typeof request.data?.network === 'string' ? request.data.network : '';
  const account = typeof request.data?.account === 'string' ? request.data.account.trim().slice(0, 200) : '';
  const amountPoints = request.data?.amountPoints;
  if (!Number.isSafeInteger(amountPoints) || amountPoints <= 0) throw new HttpsError('invalid-argument', 'Adadin points bai dace ba.');
  if (!account) throw new HttpsError('invalid-argument', 'Shigar da account, email, phone ko wallet address.');
  const usd = USD_METHODS.has(method);
  if (!usd && !NAIRA_METHODS.has(method)) throw new HttpsError('invalid-argument', 'Ba a san hanyar cire kuɗin ba.');
  if (usd && amountPoints < MIN_USD_POINTS) throw new HttpsError('failed-precondition', 'Mafi ƙaranci 300,000 points ($5).');
  if (!usd && amountPoints < MIN_NAIRA_POINTS) throw new HttpsError('failed-precondition', 'Mafi ƙaranci 200,000 points (₦5,000).');
  if (method === 'Airtime' && !['MTN', 'GLO', 'AIRTEL', '9MOBILE'].includes(network)) throw new HttpsError('invalid-argument', 'Zaɓi network na airtime.');
  const userRef = db.doc(`users/${uid}`);
  const withdrawalRef = db.collection('withdrawals').doc();
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new HttpsError('failed-precondition', 'Ba a sami account ɗinka ba.');
    const balance = Number.isSafeInteger(snap.data().balance) ? snap.data().balance : 0;
    if (amountPoints > balance) throw new HttpsError('failed-precondition', 'Points ɗin sun fi balance ɗinka.');
    const payoutAmount = usd ? Number((amountPoints / MIN_USD_POINTS * 5).toFixed(2)) : Number((amountPoints / MIN_NAIRA_POINTS * 5000).toFixed(2));
    tx.update(userRef, { balance: balance - amountPoints });
    tx.create(withdrawalRef, {
      userId: uid, method, network: method === 'Airtime' ? network : '',
      amount: amountPoints, amountPoints, payoutAmount,
      payoutCurrency: usd ? 'USD' : 'NGN', account,
      balanceBefore: balance, createdAt: FieldValue.serverTimestamp(),
      status: 'pending'
    });
    return { payoutAmount, payoutCurrency: usd ? 'USD' : 'NGN', balance: balance - amountPoints };
  });
  return { ok: true, ...result, message: 'An aika withdrawal request ɗinka domin admin ya duba. Ba a aika kuɗi kai tsaye ba.' };
});
