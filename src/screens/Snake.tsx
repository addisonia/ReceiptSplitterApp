// src/screens/Snake.tsx
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  PropsWithChildren,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import {
  useNavigation,
  useFocusEffect,
  StackActions,
} from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/RootStackParams";
import { useTheme } from "../context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* -------------------------------------------------- */
/* constants                                           */
/* -------------------------------------------------- */

const HIGH_SCORE_KEY = "snake_high_score";
const snakeSize = 20;

const gameModes = {
  easy: { speed: 8, growthRate: 4 },
  normal: { speed: 14, growthRate: 3 },
  hard: { speed: 24, growthRate: 1 },
  impossible: { speed: 50, growthRate: 0 },
  actually_impossible: { speed: 0.0001, growthRate: 0 }, // avoids /0
  patience: { speed: 1, growthRate: 0 },
} satisfies Record<string, { speed: number; growthRate: number }>;

type Mode = keyof typeof gameModes;

interface Coord {
  x: number;
  y: number;
}

const { width: winW, height: winH } = Dimensions.get("window");
const gameW = Math.floor((winW * 0.9) / snakeSize) * snakeSize;
const gameH = Math.floor((winH * 0.58) / snakeSize) * snakeSize;

/* -------------------------------------------------- */
/* component                                          */
/* -------------------------------------------------- */

const Snake: React.FC = () => {
  const { theme, mode: themeMode } = useTheme();
  const nav = useNavigation<StackNavigationProp<RootStackParamList, "Snake">>();

  /* ------------------------------------------------ */
  /* refs + state                                     */
  /* ------------------------------------------------ */

  const [selectedMode, setSelectedMode] = useState<Mode>("normal");
  const speedRef = useRef<number>(gameModes.normal.speed);
  const growthRef = useRef<number>(gameModes.normal.growthRate);

  const snakeRef = useRef<Coord[]>([{ x: 0, y: 0 }]);
  const foodRef = useRef<Coord>({ x: 0, y: 0 });
  const dirRef = useRef<Coord>({ x: 0, y: 0 });

  const frameIdRef = useRef<number | null>(null);
  const lastRenderRef = useRef<number>(0);
  const pausedRef = useRef<boolean>(false);
  const gameOverRef = useRef<boolean>(false);

  const scoreRef = useRef<number>(1);
  const hiScoreRef = useRef<number>(1);

  // regular state for rerenders
  const [screenTick, setScreenTick] = useState(0);
  const [pauseTick, setPauseTick] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [hiScore, setHiScore] = useState(1);
  const [homeClr, setHomeClr] = useState(
    themeMode === "yuck" ? "#e3d400" : theme.yellow
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  /* ------------------------------------------------ */
  /* helpers                                          */
  /* ------------------------------------------------ */

  const placeFood = () => {
    const cols = gameW / snakeSize;
    const rows = gameH / snakeSize;

    const minX = 1;
    const minY = 1;
    const maxX = cols - 2;
    const maxY = rows - 2;

    let pos: Coord;
    do {
      pos = {
        x: Math.floor(Math.random() * (maxX - minX + 1) + minX) * snakeSize,
        y: Math.floor(Math.random() * (maxY - minY + 1) + minY) * snakeSize,
      };
    } while (snakeRef.current.some((s) => s.x === pos.x && s.y === pos.y));

    foodRef.current = pos;
  };

  const resetGame = useCallback(() => {
    snakeRef.current = [{ x: 0, y: 0 }];
    dirRef.current = { x: 0, y: 0 };
    scoreRef.current = 1;
    gameOverRef.current = false;
    setShowModal(false);
    placeFood();

    // reset timer so new speed applies instantly
    lastRenderRef.current = performance.now();
    setScreenTick((t) => t + 1);
  }, []);

  const hitWallOrSelf = (head: Coord) => {
    const hitWall =
      head.x < 0 ||
      head.x >= gameW - snakeSize ||
      head.y < 0 ||
      head.y >= gameH - snakeSize;

    const hitSelf = snakeRef.current
      .slice(1)
      .some((s) => s.x === head.x && s.y === head.y);

    return hitWall || hitSelf;
  };

  /* ------------------------------------------------ */
  /* main loop                                        */
  /* ------------------------------------------------ */

  const update = () => {
    if (dirRef.current.x === 0 && dirRef.current.y === 0) return;

    const head = snakeRef.current[0];
    const newHead: Coord = {
      x: head.x + dirRef.current.x * snakeSize,
      y: head.y + dirRef.current.y * snakeSize,
    };

    if (hitWallOrSelf(newHead)) {
      gameOverRef.current = true;
      setShowModal(true);
      return;
    }

    snakeRef.current.unshift(newHead);

    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      // eat
      scoreRef.current += growthRef.current + 1;
      for (let i = 0; i < growthRef.current; i++) {
        snakeRef.current.push({ ...snakeRef.current.at(-1)! });
      }
      placeFood();

      if (scoreRef.current > hiScoreRef.current) {
        hiScoreRef.current = scoreRef.current;
        setHiScore(scoreRef.current);
        AsyncStorage.setItem(HIGH_SCORE_KEY, scoreRef.current.toString()).catch(
          (err) => console.log("cannot save high score", err)
        );
      }
    } else {
      snakeRef.current.pop();
    }

    setScreenTick((t) => t + 1);
  };

  const loop = (time: number) => {
    if (pausedRef.current || gameOverRef.current) {
      lastRenderRef.current = time;
      frameIdRef.current = requestAnimationFrame(loop);
      return;
    }

    const delta = (time - lastRenderRef.current) / 1000;
    if (delta >= 1 / speedRef.current) {
      lastRenderRef.current = time;
      update();
    }
    frameIdRef.current = requestAnimationFrame(loop);
  };

  /* ------------------------------------------------ */
  /* event helpers                                    */
  /* ------------------------------------------------ */

  const setDir = (dx: number, dy: number) => {
    if (dx !== 0 && dirRef.current.x !== 0) return; // block 180° turn
    if (dy !== 0 && dirRef.current.y !== 0) return;
    dirRef.current = { x: dx, y: dy };
  };

  /* ------------------------------------------------ */
  /* effects                                          */
  /* ------------------------------------------------ */

  // one-time load of stored high score
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        if (raw) {
          const stored = parseInt(raw, 10);
          hiScoreRef.current = stored;
          setHiScore(stored);
        }
      } catch (e) {
        console.log("cannot read high score", e);
      }
    })();
  }, []);

  // restart whenever mode changes
  useEffect(() => {
    speedRef.current = gameModes[selectedMode].speed;
    growthRef.current = gameModes[selectedMode].growthRate;
    resetGame();
  }, [selectedMode, resetGame]);

  // handle focus / blur to start and stop loop
  useFocusEffect(
    useCallback(() => {
      lastRenderRef.current = performance.now();
      frameIdRef.current = requestAnimationFrame(loop);

      return () => {
        if (frameIdRef.current !== null) {
          cancelAnimationFrame(frameIdRef.current);
          frameIdRef.current = null;
        }
      };
    }, [])
  );

  /* ------------------------------------------------ */
  /* render helpers                                   */
  /* ------------------------------------------------ */

  const arrowBtnStyle = {
    backgroundColor: themeMode === "yuck" ? "#e3d400" : theme.yellow,
    borderColor: theme.black,
  };

  const scoreBg = themeMode === "yuck" ? "#2e2b3d" : theme.yuckLight;

  /* ------------------------------------------------ */
  /* render                                           */
  /* ------------------------------------------------ */

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: themeMode === "yuck" ? "#5c540b" : theme.offWhite2 },
      ]}
    >
      <StatusBar
        barStyle={
          themeMode === "offWhite" || themeMode === "default"
            ? "dark-content"
            : "light-content"
        }
        backgroundColor={themeMode === "yuck" ? "#5c540b" : theme.offWhite2}
      />

      {/* top bar */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => {
            setHomeClr(themeMode === "yuck" ? "#08f800" : theme.green);
            nav.dispatch(StackActions.popToTop());
            nav.navigate("MainTabs", { screen: "Home" });
            setTimeout(
              () => setHomeClr(themeMode === "yuck" ? "#e3d400" : theme.yellow),
              200
            );
          }}
          style={styles.homeButton}
        >
          <Icon name="home" size={30} color={homeClr} />
        </TouchableOpacity>

        <View style={styles.modeSelectContainer}>
          <TouchableOpacity
            style={[
              styles.selectModeButton,
              {
                backgroundColor:
                  themeMode === "yuck" ? "#e3d400" : theme.yellow,
                borderColor: theme.black,
              },
            ]}
            onPress={() => setPickerOpen((p) => !p)}
          >
            <Text style={styles.selectModeText}>
              {selectedMode.replace("_", " ")}
            </Text>
            <Icon
              name={pickerOpen ? "caret-up" : "caret-down"}
              size={20}
              color={theme.black}
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>

          {pickerOpen && (
            <View
              style={[
                styles.modeDropdown,
                {
                  backgroundColor:
                    themeMode === "yuck" ? "#e3d400" : theme.yellow,
                  borderColor: theme.black,
                },
              ]}
            >
              {(Object.keys(gameModes) as Mode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.modeDropDownItem,
                    selectedMode === m && styles.selectedMode,
                  ]}
                  onPress={() => {
                    setSelectedMode(m);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={styles.modeItemText}>{m.replace("_", " ")}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* score boxes */}
      <View style={styles.scoreboardContainer}>
        <View style={[styles.scoreBox, { backgroundColor: scoreBg }]}>
          <Text style={styles.scoreText}>current: {scoreRef.current}</Text>
        </View>
        <View style={[styles.scoreBox, { backgroundColor: scoreBg }]}>
          <Text style={styles.scoreText}>high: {hiScore}</Text>
        </View>
      </View>

      {/* game area */}
      <TouchableWithoutFeedback
        onPress={() => {
          pausedRef.current = !pausedRef.current;
          setPauseTick((t) => t + 1);
        }}
      >
        <View
          style={[
            styles.gameArea,
            {
              width: gameW,
              height: gameH,
              backgroundColor:
                themeMode === "yuck" ? "#9e9b7b" : theme.yuckLight,
              borderColor: themeMode === "yuck" ? "#2e2b3d" : theme.offWhite,
            },
          ]}
        >
          {snakeRef.current.map((seg, idx) => (
            <View
              key={idx}
              style={[
                styles.snake,
                {
                  left: seg.x,
                  top: seg.y,
                  backgroundColor:
                    themeMode === "yuck" ? "#2e2b3d" : theme.offWhite,
                },
              ]}
            />
          ))}
          <View
            style={[
              styles.food,
              {
                left: foodRef.current.x,
                top: foodRef.current.y,
                backgroundColor: themeMode === "yuck" ? "#b6390b" : theme.blood,
              },
            ]}
          />
          {pausedRef.current && (
            <View
              key={pauseTick}
              style={[
                styles.pauseOverlay,
                {
                  backgroundColor:
                    themeMode === "yuck"
                      ? "rgba(255,141,141,0.8)"
                      : theme.orange,
                },
              ]}
            >
              <Text style={styles.pauseText}>paused</Text>
              <Text style={styles.pauseSubText}>(tap to unpause)</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* control buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          onPress={() => setDir(-1, 0)}
          style={[styles.arrowButton, arrowBtnStyle]}
        >
          <Text style={styles.buttonText}>left</Text>
        </TouchableOpacity>

        <View style={styles.verticalButtons}>
          <TouchableOpacity
            onPress={() => setDir(0, -1)}
            style={[styles.arrowButton, arrowBtnStyle]}
          >
            <Text style={styles.buttonText}>up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setDir(0, 1)}
            style={[styles.arrowButton, arrowBtnStyle]}
          >
            <Text style={styles.buttonText}>down</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setDir(1, 0)}
          style={[styles.arrowButton, arrowBtnStyle]}
        >
          <Text style={styles.buttonText}>right</Text>
        </TouchableOpacity>
      </View>

      {/* game over modal */}
      {showModal && (
        <View style={styles.gameOverModal}>
          <View
            style={[
              styles.gameOverContent,
              {
                backgroundColor:
                  themeMode === "yuck" ? "#5c540b" : theme.offWhite2,
                borderColor: themeMode === "yuck" ? "#e3d400" : theme.yellow,
              },
            ]}
          >
            <Text
              style={[
                styles.gameOverTitle,
                { color: themeMode === "yuck" ? "#e3d400" : theme.yellow },
              ]}
            >
              game over
            </Text>
            <Text style={styles.gameOverText}>score: {scoreRef.current}</Text>
            <TouchableOpacity
              style={[
                styles.gameOverButton,
                {
                  backgroundColor:
                    themeMode === "yuck" ? "#e3d400" : theme.yellow,
                  borderColor: theme.black,
                },
              ]}
              onPress={resetGame}
            >
              <Text style={styles.gameOverButtonText}>restart</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

/* -------------------------------------------------- */
/* styles                                             */
/* -------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
  topRow: {
    flexDirection: "row",
    width: "90%",
    marginTop: 20,
    marginBottom: 10,
    alignItems: "center",
    zIndex: 1,
  },
  homeButton: { flex: 1, alignItems: "flex-start", marginLeft: 6 },
  modeSelectContainer: { flex: 3, marginRight: 4, alignItems: "flex-end" },
  selectModeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  selectModeText: { color: "#000", fontSize: 18 },
  modeDropdown: {
    position: "absolute",
    top: 45,
    right: 0,
    width: "100%",
    borderWidth: 2,
    borderRadius: 5,
    marginTop: 5,
    zIndex: 2,
  },
  modeDropDownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  modeItemText: { fontSize: 18, color: "#000" },
  selectedMode: { backgroundColor: "#f0e68c" },
  scoreboardContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "90%",
    marginVertical: 10,
  },
  scoreBox: { padding: 10, width: 150, alignItems: "center", borderRadius: 5 },
  scoreText: { color: "#fff", fontSize: 16 },
  gameArea: {
    borderWidth: 10,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  snake: { position: "absolute", width: snakeSize, height: snakeSize },
  food: { position: "absolute", width: snakeSize, height: snakeSize },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  pauseText: { fontSize: 40, color: "#fff" },
  pauseSubText: { fontSize: 30, color: "#fff" },
  buttonsContainer: {
    flexDirection: "row",
    marginTop: (winH - gameH) / 50,
    width: gameW,
    justifyContent: "space-between",
    flexGrow: 1,
  },
  verticalButtons: { flexDirection: "column", flex: 1.2 },
  arrowButton: {
    borderWidth: 2,
    margin: 5,
    paddingVertical: 18,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 18, color: "#000" },
  gameOverModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
  gameOverContent: {
    padding: 20,
    borderRadius: 10,
    borderWidth: 4,
    alignItems: "center",
  },
  gameOverTitle: { fontSize: 32, fontWeight: "bold", marginBottom: 10 },
  gameOverText: { color: "#fff", fontSize: 24, marginBottom: 20 },
  gameOverButton: {
    paddingVertical: 15,
    paddingHorizontal: 35,
    borderRadius: 5,
    borderWidth: 2,
  },
  gameOverButtonText: { color: "#000", fontSize: 20, fontWeight: "bold" },
});

export default Snake;
