import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * ============================================================
 * VYRA REWARDS
 * ============================================================
 * Simple rewards / points application.
 *
 * Storage:
 *   vyra_points
 *   vyra_taps
 *   vyra_completed
 *   vyra_email
 *   vyra_withdraw_method
 *   vyra_first_launch
 *
 * IMPORTANT:
 * This app stores points locally on the device.
 * The withdraw screen currently creates a request message only.
 * A real payment backend/API is required for actual withdrawals.
 * ============================================================
 */

const APP_NAME = 'Vyra Rewards';
const APP_VERSION = '1.0.0';

const MONETAG_DIRECT_LINK = 'https://uplcm.com/4/11966517';

const BG = '#0A0A0A';
const CARD = '#1A1A1A';
const CARD_2 = '#202020';
const BORDER = '#2A2A2A';

const GOLD = '#FFD700';
const GREEN = '#00FF88';
const RED = '#FF4D4D';
const BLUE = '#4DA6FF';
const PURPLE = '#9B59FF';

const TEXT = '#FFFFFF';
const MUTED = '#888888';
const DARK_TEXT = '#0A0A0A';

const POINTS_PER_TAP = 2;
const WATCH_AD_POINTS = 50;
const MIN_WITHDRAW_POINTS = 5000;

const STORAGE_POINTS = 'vyra_points';
const STORAGE_TAPS = 'vyra_taps';
const STORAGE_COMPLETED = 'vyra_completed';
const STORAGE_EMAIL = 'vyra_email';
const STORAGE_METHOD = 'vyra_withdraw_method';
const STORAGE_FIRST_LAUNCH = 'vyra_first_launch';

/*
 * ============================================================
 * TASK LIST
 * ============================================================
 */

type Task = {
  id: number;
  name: string;
  bonus: number;
  link: string;
  code?: string;
  color: string;
  description?: string;
};

const TASKS_10: Task[] = [
  {
    id: 1,
    name: 'GTBank - GTWorld',
    bonus: 80,
    link: 'https://l.ead.me/gtworld',
    color: '#E3530F',
    description: 'Open the GTWorld offer.',
  },
  {
    id: 2,
    name: 'PalmPay - 5,550 Bonus',
    bonus: 100,
    link: 'https://info.palmpay.com/j4ObFGCq',
    code: 'NSFM3287',
    color: '#6C2EB5',
    description: 'Use the referral code when required.',
  },
  {
    id: 3,
    name: 'FairMoney',
    bonus: 90,
    link: 'https://fairmoney.io/referral?referral_code=UAPM5BZ',
    code: 'UAPM5BZ',
    color: '#1A1A1A',
    description: 'Open the FairMoney referral offer.',
  },
  {
    id: 4,
    name: 'Binance',
    bonus: 120,
    link: 'https://account.binance.com/register?ref=1205609224',
    code: '1205609224',
    color: '#F3BA2F',
    description: 'Open the Binance referral page.',
  },
  {
    id: 5,
    name: 'PiggyVest - 1,000 Bonus',
    bonus: 80,
    link: 'https://join.piggyvest.com/secrethajiya004',
    code: 'secrethajiya004',
    color: '#0D60D8',
    description: 'Open the PiggyVest offer.',
  },
  {
    id: 6,
    name: 'Moniepoint',
    bonus: 100,
    link: 'https://join.moniepoint.com?adj_t=15ha060e&rC=TLEG561',
    code: 'TLEG561',
    color: '#0047AB',
    description: 'Open the Moniepoint referral offer.',
  },
  {
    id: 7,
    name: 'Flutterwave Send',
    bonus: 70,
    link: 'https://send.flutterwave.com/ref/?code=OAIH4CJTJI94',
    code: 'OAIH4CJTJI94',
    color: '#FB9129',
    description: 'Open Flutterwave Send referral.',
  },
  {
    id: 8,
    name: 'OPay',
    bonus: 80,
    link: 'https://opay.com',
    color: '#00A651',
    description: 'Open the OPay website.',
  },
  {
    id: 9,
    name: 'Kuda Bank',
    bonus: 80,
    link: 'https://kuda.com',
    color: '#40196D',
    description: 'Open the Kuda website.',
  },
  {
    id: 10,
    name: 'Carbon',
    bonus: 70,
    link: 'https://getcarbon.co',
    color: '#5A2D82',
    description: 'Open the Carbon website.',
  },
];

/*
 * ============================================================
 * SMALL HELPER COMPONENTS
 * ============================================================
 */

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: string;
};

function StatCard({
  title,
  value,
  subtitle,
  accent = GOLD,
}: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>

      <Text style={[styles.statValue, { color: accent }]}>
        {value}
      </Text>

      {subtitle ? (
        <Text style={styles.statSubtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      {subtitle ? (
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

/*
 * ============================================================
 * MAIN APP
 * ============================================================
 */

export default function App() {
  const [points, setPoints] = useState<number>(0);
  const [taps, setTaps] = useState<number>(0);
  const [tab, setTab] = useState<'home' | 'wallet'>('home');

  const [email, setEmail] = useState<string>('');
  const [withdrawMethod, setWithdrawMethod] =
    useState<string>('OPay');

  const [completed, setCompleted] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [lastEarned, setLastEarned] = useState<number>(0);
  const [showTaskInfo, setShowTaskInfo] = useState<number | null>(null);

  /*
   * ----------------------------------------------------------
   * LOAD SAVED DATA
   * ----------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [
          savedPoints,
          savedTaps,
          savedCompleted,
          savedEmail,
          savedMethod,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_POINTS),
          AsyncStorage.getItem(STORAGE_TAPS),
          AsyncStorage.getItem(STORAGE_COMPLETED),
          AsyncStorage.getItem(STORAGE_EMAIL),
          AsyncStorage.getItem(STORAGE_METHOD),
        ]);

        if (!mounted) {
          return;
        }

        if (savedPoints !== null) {
          const parsedPoints = parseInt(savedPoints, 10);

          if (!Number.isNaN(parsedPoints)) {
            setPoints(parsedPoints);
          }
        }

        if (savedTaps !== null) {
          const parsedTaps = parseInt(savedTaps, 10);

          if (!Number.isNaN(parsedTaps)) {
            setTaps(parsedTaps);
          }
        }

        if (savedCompleted !== null) {
          try {
            const parsedCompleted = JSON.parse(savedCompleted);

            if (Array.isArray(parsedCompleted)) {
              setCompleted(parsedCompleted);
            }
          } catch {
            setCompleted([]);
          }
        }

        if (savedEmail !== null) {
          setEmail(savedEmail);
        }

        if (savedMethod !== null) {
          setWithdrawMethod(savedMethod);
        }
      } catch (error) {
        console.log('Vyra load error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ----------------------------------------------------------
   * SAVE POINTS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (loading) {
      return;
    }

    AsyncStorage.setItem(
      STORAGE_POINTS,
      String(points),
    ).catch(error => {
      console.log('Points save error:', error);
    });
  }, [points, loading]);

  /*
   * ----------------------------------------------------------
   * SAVE TAPS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (loading) {
      return;
    }

    AsyncStorage.setItem(
      STORAGE_TAPS,
      String(taps),
    ).catch(error => {
      console.log('Taps save error:', error);
    });
  }, [taps, loading]);

  /*
   * ----------------------------------------------------------
   * SAVE COMPLETED TASKS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (loading) {
      return;
    }

    AsyncStorage.setItem(
      STORAGE_COMPLETED,
      JSON.stringify(completed),
    ).catch(error => {
      console.log('Completed save error:', error);
    });
  }, [completed, loading]);

  /*
   * ----------------------------------------------------------
   * SAVE ACCOUNT DETAILS
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (loading) {
      return;
    }

    AsyncStorage.setItem(
      STORAGE_EMAIL,
      email,
    ).catch(error => {
      console.log('Email save error:', error);
    });
  }, [email, loading]);

  useEffect(() => {
    if (loading) {
      return;
    }

    AsyncStorage.setItem(
      STORAGE_METHOD,
      withdrawMethod,
    ).catch(error => {
      console.log('Method save error:', error);
    });
  }, [withdrawMethod, loading]);

  /*
   * ----------------------------------------------------------
   * FIRST LAUNCH
   * ----------------------------------------------------------
   */

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const firstLaunch = await AsyncStorage.getItem(
          STORAGE_FIRST_LAUNCH,
        );

        if (!firstLaunch) {
          await AsyncStorage.setItem(
            STORAGE_FIRST_LAUNCH,
            'true',
          );
        }
      } catch (error) {
        console.log('First launch error:', error);
      }
    };

    checkFirstLaunch();
  }, []);

  /*
   * ----------------------------------------------------------
   * POINT CALCULATIONS
   * ----------------------------------------------------------
   */

  const completedCount = completed.length;

  const taskPoints = useMemo(() => {
    return TASKS_10.reduce((total, task) => {
      if (completed.includes(task.id)) {
        return total + task.bonus;
      }

      return total;
    }, 0);
  }, [completed]);

  const progressPercent = useMemo(() => {
    if (TASKS_10.length === 0) {
      return 0;
    }

    return Math.round(
      (completedCount / TASKS_10.length) * 100,
    );
  }, [completedCount]);

  /*
   * ----------------------------------------------------------
   * ADD POINTS
   * ----------------------------------------------------------
   */

  const addPoints = (amount: number) => {
    if (amount <= 0) {
      return;
    }

    setPoints(previous => previous + amount);
    setLastEarned(amount);
  };

  /*
   * ----------------------------------------------------------
   * TAP TO EARN
   * ----------------------------------------------------------
   */

  const handleTap = () => {
    const newTapCount = taps + 1;

    setTaps(newTapCount);
    addPoints(POINTS_PER_TAP);

    /*
     * Open the Monetag direct link after every 10 taps.
     */
    if (newTapCount % 10 === 0) {
      Linking.openURL(MONETAG_DIRECT_LINK).catch(() => {
        Alert.alert(
          'Ad Link',
          'Ba a iya bude ad link a wannan lokacin ba.',
        );
      });
    }
  };

  /*
   * ----------------------------------------------------------
   * WATCH AD
   * ----------------------------------------------------------
   */

  const handleWatchAd = async () => {
    try {
      await Linking.openURL(MONETAG_DIRECT_LINK);
      addPoints(WATCH_AD_POINTS);

      Alert.alert(
        'Bonus!',
        `Ka samu +${WATCH_AD_POINTS} points.`,
      );
    } catch {
      Alert.alert(
        'Ad Link',
        'Ba a iya bude ad link ba.',
      );
    }
  };

  /*
   * ----------------------------------------------------------
   * TASK HANDLER
   * ----------------------------------------------------------
   */

  const handleTask = async (task: Task) => {
    if (completed.includes(task.id)) {
      Alert.alert(
        'An riga an kammala',
        `${task.name} yana cikin completed tasks.`,
      );

      return;
    }

    try {
      await Linking.openURL(task.link);

      addPoints(task.bonus);

      setCompleted(previous => {
        if (previous.includes(task.id)) {
          return previous;
        }

        return [...previous, task.id];
      });

      Alert.alert(
        'Bonus!',
        `Ka samu +${task.bonus} points daga ${task.name}.`,
      );
    } catch {
      Alert.alert(
        'Error',
        'Ba a iya bude wannan link din ba.',
      );
    }
  };

  /*
   * ----------------------------------------------------------
   * SHARE APP
   * ----------------------------------------------------------
   */

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          'Ka sauke Vyra Rewards ka samu rewards! Use code VYRA2026',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  /*
   * ----------------------------------------------------------
   * WITHDRAW
   * ----------------------------------------------------------
   */

  const handleWithdraw = () => {
    const cleanAccount = email.trim();

    if (points < MIN_WITHDRAW_POINTS) {
      Alert.alert(
        'Rashin Points',
        `Kana bukatar ${MIN_WITHDRAW_POINTS} points kafin withdraw.`,
      );

      return;
    }

    if (!cleanAccount) {
      Alert.alert(
        'Shigar da Account',
        'Da fatan shigar da account number ko email.',
      );

      return;
    }

    Alert.alert(
      'Withdraw Request',
      `An karbi bukatarka!\n\nPoints: ${points}\nMethod: ${withdrawMethod}\nAccount: ${cleanAccount}\n\nZa a duba request din kafin biyan kudi.`,
      [
        {
          text: 'OK',
          style: 'default',
        },
      ],
    );
  };

  /*
   * ----------------------------------------------------------
   * RESET LOCAL DATA
   * ----------------------------------------------------------
   */

  const handleReset = () => {
    Alert.alert(
      'Reset App',
      'Kana son goge points da tasks da aka ajiye a wannan wayar?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                STORAGE_POINTS,
                STORAGE_TAPS,
                STORAGE_COMPLETED,
                STORAGE_EMAIL,
                STORAGE_METHOD,
              ]);

              setPoints(0);
              setTaps(0);
              setCompleted([]);
              setEmail('');
              setWithdrawMethod('OPay');
              setLastEarned(0);

              Alert.alert(
                'Done',
                'An reset din Vyra Rewards.',
              );
            } catch {
              Alert.alert(
                'Error',
                'An samu matsala wajen reset.',
              );
            }
          },
        },
      ],
    );
  };

  /*
   * ----------------------------------------------------------
   * INFO
   * ----------------------------------------------------------
   */

  const handleInfo = () => {
    Alert.alert(
      APP_NAME,
      `Version ${APP_VERSION}\n\nTap to earn points, complete offers and build your balance.\n\n1000 PTS = ₦100\nMinimum withdrawal = 5000 PTS`,
      [
        {
          text: 'Close',
          style: 'cancel',
        },
        {
          text: 'Reset Data',
          style: 'destructive',
          onPress: handleReset,
        },
      ],
    );
  };

  /*
   * ----------------------------------------------------------
   * LOADING SCREEN
   * ----------------------------------------------------------
   */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={BG}
        />

        <Text style={styles.loadingLogo}>
          VYRA
        </Text>

        <Text style={styles.loadingTitle}>
          REWARDS
        </Text>

        <Text style={styles.loadingText}>
          Loading...
        </Text>
      </View>
    );
  }

  /*
   * ----------------------------------------------------------
   * MAIN SCREEN
   * ----------------------------------------------------------
   */

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={BG}
      />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>
            VYRA REWARDS
          </Text>

          <Text style={styles.headerSubtitle}>
            Earn • Complete • Withdraw
          </Text>
        </View>

        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>
            {points.toLocaleString()} PTS
          </Text>
        </View>
      </View>

      {/* HOME */}
      {tab === 'home' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* BALANCE HERO */}
          <View style={styles.balanceHero}>
            <Text style={styles.balanceLabel}>
              CURRENT BALANCE
            </Text>

            <Text style={styles.balanceAmount}>
              {points.toLocaleString()}
            </Text>

            <Text style={styles.balancePoints}>
              POINTS
            </Text>

            <View style={styles.balanceDivider} />

            <Text style={styles.balanceNaira}>
              ≈ ₦{Math.floor(points / 10).toLocaleString()}
            </Text>

            <Text style={styles.balanceRate}>
              1000 PTS = ₦100
            </Text>
          </View>

          {/* TAP SECTION */}
          <View style={styles.tapSection}>
            <Text style={styles.tapHeading}>
              TAP & EARN
            </Text>

            <Text style={styles.tapDescription}>
              Tap the button to earn {POINTS_PER_TAP} points
            </Text>

            <TouchableOpacity
              style={styles.tapCircle}
              onPress={handleTap}
              activeOpacity={0.78}
            >
              <View style={styles.tapCircleInner}>
                <Text style={styles.tapSmall}>
                  TAP TO
                </Text>

                <Text style={styles.tapTitle}>
                  EARN
                </Text>

                <Text style={styles.tapSub}>
                  +{POINTS_PER_TAP} PTS
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.tapCounter}>
              {taps.toLocaleString()} taps
            </Text>

            {lastEarned > 0 ? (
              <View style={styles.earnedPill}>
                <Text style={styles.earnedPillText}>
                  +{lastEarned} PTS EARNED
                </Text>
              </View>
            ) : null}
          </View>

          {/* STAT CARDS */}
          <View style={styles.statsRow}>
            <StatCard
              title="BALANCE"
              value={points.toLocaleString()}
              subtitle="Points"
              accent={GOLD}
            />

            <StatCard
              title="TASKS"
              value={`${completedCount}/10`}
              subtitle={`${progressPercent}% complete`}
              accent={GREEN}
            />

            <StatCard
              title="TAPS"
              value={taps.toLocaleString()}
              subtitle="Total taps"
              accent={BLUE}
            />
          </View>

          {/* WATCH AD */}
          <TouchableOpacity
            style={styles.watc
