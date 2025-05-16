// src/screens/Snake.tsx
import React, { useState, useEffect, useRef } from "react";
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
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/RootStackParams";
import { useTheme } from "../context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HIGH_SCORE_KEY = "snake_high_score";

const snakeSize = 20;

const gameModes: Record<string, { speed: number; growthRate: number }> = {
  easy: { speed: 8, growthRate: 4 },
  normal: { speed: 14, growthRate: 3 },
  hard: { speed: 24, growthRate: 1 },
  impossible: { speed: 50, growthRate: 0 },
  actually_impossible: { speed: 0, growthRate: 0 },
  patience: { speed: 1, growthRate: 0 },
};

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const gameAreaWidth = Math.floor((windowWidth * 0.9) / snakeSize) * snakeSize;
const gameAreaHeight =
  Math.floor((windowHeight * 0.58) / snakeSize) * snakeSize;

const Snake: React.FC = () => {
  const { theme, mode } = useTheme();
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, "Snake">>();

  const [selectedMode, setSelectedMode] =
    useState<keyof typeof gameModes>("normal");
  const [highScore, setHighScore] = useState(1);
  const [homeIconColor, setHomeIconColor] = useState(
    mode === "yuck" ? "#e3d400" : theme.yellow
  );
  const [isModeSelectionOpen, setIsModeSelectionOpen] = useState(false);

  const snakeRef = useRef([{ x: 0, y: 0 }]);
  const [showGameOver, setShowGameOver] = useState(false);
  const foodRef = useRef({ x: 0, y: 0 });
  const directionRef = useRef({ x: 0, y: 0 });
  const isPausedRef = useRef(false);
  const lastRenderTimeRef = useRef(0);
  const gameOverRef = useRef(false);

  const scoreRef = useRef(0);
  const highScoreRef = useRef(highScore);

  const speedRef = useRef(gameModes[selectedMode].speed);
  const growthRef = useRef(gameModes[selectedMode].growthRate);

  const [tick, setTick] = useState(0);
  const [pauseTick, setPauseTick] = useState(0);

  useEffect(() => {
    speedRef.current = gameModes[selectedMode].speed;
    growthRef.current = gameModes[selectedMode].growthRate;
    resetGame();
  }, [selectedMode]);

  // load once when the screen mounts
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(HIGH_SCORE_KEY);
        if (raw !== null) {
          const stored = parseInt(raw, 10);
          setHighScore(stored);
          highScoreRef.current = stored;
        }
      } catch (err) {
        console.log("cannot read high score", err);
      }
    })();
  }, []);

  const placeFood = () => {
    const columns = gameAreaWidth / snakeSize;
    const rows = gameAreaHeight / snakeSize;

    let minX = 1;
    let minY = 1;
    let maxX = columns - 2;
    let maxY = rows - 2;

    let newFood: { x: number; y: number };
    do {
      const fx =
        Math.floor(Math.random() * (maxX - minX + 1) + minX) * snakeSize;
      const fy =
        Math.floor(Math.random() * (maxY - minY + 1) + minY) * snakeSize;
      newFood = { x: fx, y: fy };
    } while (
      snakeRef.current.some((seg) => seg.x === newFood.x && seg.y === newFood.y)
    );

    foodRef.current = newFood;
  };

  const resetGame = () => {
    snakeRef.current = [{ x: 0, y: 0 }];
    directionRef.current = { x: 0, y: 0 };
    gameOverRef.current = false;
    setShowGameOver(false);
    scoreRef.current = 1;
    placeFood();
    setTick((t) => t + 1);
  };

  const checkCollisions = (head: { x: number; y: number }) => {
    if (
      head.x < 0 ||
      head.x >= gameAreaWidth - snakeSize ||
      head.y < 0 ||
      head.y >= gameAreaHeight - snakeSize
    ) {
      return true;
    }
    return snakeRef.current
      .slice(1)
      .some((seg) => seg.x === head.x && seg.y === head.y);
  };

  const GameOverModal = () => {
    const [isRestartPressed, setIsRestartPressed] = useState(false);
    return (
      <View style={styles.gameOverModal}>
        <View
          style={[
            styles.gameOverContent,
            {
              backgroundColor: mode === "yuck" ? "#5c540b" : theme.offWhite2,
              borderColor: mode === "yuck" ? "#e3d400" : theme.yellow,
            },
          ]}
        >
          <Text
            style={[
              styles.gameOverTitle,
              { color: mode === "yuck" ? "#e3d400" : theme.yellow },
            ]}
          >
            game over
          </Text>
          <Text style={styles.gameOverText}>score: {scoreRef.current}</Text>
          <TouchableOpacity
            style={[
              styles.gameOverButton,
              {
                backgroundColor: isRestartPressed
                  ? mode === "yuck"
                    ? "#ff4444"
                    : theme.blood
                  : mode === "yuck"
                  ? "#e3d400"
                  : theme.yellow,
              },
              { borderColor: theme.black },
            ]}
            onPressIn={() => setIsRestartPressed(true)}
            onPressOut={() => setIsRestartPressed(false)}
            onPress={() => {
              gameOverRef.current = false;
              resetGame();
            }}
            activeOpacity={1}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <Text style={styles.gameOverButtonText}>restart</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const update = () => {
    if (directionRef.current.x === 0 && directionRef.current.y === 0) {
      return;
    }

    const currentHead = snakeRef.current[0];
    const newHead = {
      x: currentHead.x + directionRef.current.x * snakeSize,
      y: currentHead.y + directionRef.current.y * snakeSize,
    };

    if (checkCollisions(newHead)) {
      gameOverRef.current = true;
      setShowGameOver(true);
      return;
    }

    snakeRef.current.unshift(newHead);
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      scoreRef.current += growthRef.current + 1;
      for (let i = 0; i < growthRef.current; i++) {
        snakeRef.current.push({
          ...snakeRef.current[snakeRef.current.length - 1],
        });
      }
      placeFood();

      if (scoreRef.current > highScoreRef.current) {
        setHighScore(scoreRef.current);
        highScoreRef.current = scoreRef.current;

        // save to storage (fire-and-forget; no need to await)
        AsyncStorage.setItem(HIGH_SCORE_KEY, scoreRef.current.toString()).catch(
          (err) => console.log("cannot save high score", err)
        );
      }
    } else {
      snakeRef.current.pop();
    }
    setTick((t) => t + 1);
  };

  const gameLoop = (currentTime: number) => {
    if (isPausedRef.current || gameOverRef.current) {
      lastRenderTimeRef.current = currentTime;
      requestAnimationFrame(gameLoop);
      return;
    }
    const secsSinceLast = (currentTime - lastRenderTimeRef.current) / 1000;
    if (speedRef.current > 0 && secsSinceLast < 1 / speedRef.current) {
      requestAnimationFrame(gameLoop);
      return;
    }
    lastRenderTimeRef.current = currentTime;
    update();
    requestAnimationFrame(gameLoop);
  };

  const leftArrow = () => {
    if (directionRef.current.x === 0) directionRef.current = { x: -1, y: 0 };
  };
  const upArrow = () => {
    if (directionRef.current.y === 0) directionRef.current = { x: 0, y: -1 };
  };
  const downArrow = () => {
    if (directionRef.current.y === 0) directionRef.current = { x: 0, y: 1 };
  };
  const rightArrow = () => {
    if (directionRef.current.x === 0) directionRef.current = { x: 1, y: 0 };
  };

  const togglePause = () => {
    isPausedRef.current = !isPausedRef.current;
    setPauseTick((pt) => pt + 1);
  };

  useEffect(() => {
    placeFood();
    requestAnimationFrame(gameLoop);
  }, []);

  const goHome = () => {
    setHomeIconColor(mode === "yuck" ? "#08f800" : theme.green);
    navigation.navigate("MainTabs", { screen: "Home" });
    setTimeout(
      () => setHomeIconColor(mode === "yuck" ? "#e3d400" : theme.yellow),
      200
    );
  };

  const handleModeChange = (mode: keyof typeof gameModes) => {
    setSelectedMode(mode);
    setIsModeSelectionOpen(false);
  };

  const getScoreBoxBackground = () => {
    return mode === "yuck" ? "#2e2b3d" : theme.lightGray; // Distinct from offWhite2
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: mode === "yuck" ? "#5c540b" : theme.offWhite2 },
      ]}
    >
      <StatusBar
        barStyle={
          mode === "offWhite" || mode === "default"
            ? "dark-content"
            : "light-content"
        }
        backgroundColor={mode === "yuck" ? "#5c540b" : theme.offWhite2}
      />

      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={goHome}
          style={styles.homeButton}
          onPressIn={() =>
            setHomeIconColor(mode === "yuck" ? "#08f800" : theme.green)
          }
          onPressOut={() =>
            setHomeIconColor(mode === "yuck" ? "#e3d400" : theme.yellow)
          }
        >
          <Icon name="home" size={30} color={homeIconColor} />
        </TouchableOpacity>

        <View style={styles.modeSelectContainer}>
          <TouchableOpacity
            style={[
              styles.selectModeButton,
              {
                backgroundColor: mode === "yuck" ? "#e3d400" : theme.yellow,
                borderColor: theme.black,
              },
            ]}
            onPress={() => setIsModeSelectionOpen(!isModeSelectionOpen)}
          >
            <Text style={styles.selectModeText}>
              {selectedMode.replace("_", " ")}
            </Text>
            <Icon
              name={isModeSelectionOpen ? "caret-up" : "caret-down"}
              size={20}
              color={theme.black}
              style={styles.dropdownIcon}
            />
          </TouchableOpacity>

          {isModeSelectionOpen && (
            <View
              style={[
                styles.modeDropdown,
                {
                  backgroundColor: mode === "yuck" ? "#e3d400" : theme.yellow,
                  borderColor: theme.black,
                },
              ]}
            >
              {Object.keys(gameModes).map((mode, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modeDropDownItem,
                    selectedMode === mode ? styles.selectedMode : null,
                  ]}
                  onPress={() =>
                    handleModeChange(mode as keyof typeof gameModes)
                  }
                >
                  <Text style={styles.modeItemText}>
                    {mode.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {showGameOver && <GameOverModal />}

      <View style={styles.scoreboardContainer}>
        <View
          style={[
            styles.scoreBox,
            { backgroundColor: mode === "yuck" ? "#2e2b3d" : theme.yuckLight },
          ]}
        >
          <Text style={styles.scoreText}>
            current score: {scoreRef.current}
          </Text>
        </View>
        <View
          style={[
            styles.scoreBox,
            { backgroundColor: mode === "yuck" ? "#2e2b3d" : theme.yuckLight },
          ]}
        >
          <Text style={styles.scoreText}>high score: {highScore}</Text>
        </View>
      </View>

      <TouchableWithoutFeedback onPress={togglePause}>
        <View
          style={[
            styles.gameArea,
            {
              width: gameAreaWidth,
              height: gameAreaHeight,
              backgroundColor: mode === "yuck" ? "#9e9b7b" : theme.yuckLight,
              borderColor: mode === "yuck" ? "#2e2b3d" : theme.offWhite,
            },
          ]}
        >
          {snakeRef.current.map((segment, index) => (
            <View
              key={index}
              style={[
                styles.snake,
                {
                  left: segment.x,
                  top: segment.y,
                  backgroundColor: mode === "yuck" ? "#2e2b3d" : theme.offWhite,
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
                backgroundColor: mode === "yuck" ? "#b6390b" : theme.blood,
              },
            ]}
          />
          {isPausedRef.current && (
            <View
              style={[
                styles.pauseOverlay,
                {
                  backgroundColor:
                    mode === "yuck" ? "rgb(255, 141, 141)" : theme.orange,
                },
              ]}
              key={pauseTick}
            >
              <Text style={styles.pauseText}>paused</Text>
              <Text style={styles.pauseSubText}>(tap to unpause)</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          onPress={leftArrow}
          style={[
            styles.arrowButton,
            {
              backgroundColor: mode === "yuck" ? "#e3d400" : theme.yellow,
              borderColor: theme.black,
            },
          ]}
        >
          <Text style={styles.buttonText}>left</Text>
        </TouchableOpacity>

        <View style={styles.verticalButtons}>
          <TouchableOpacity
            onPress={upArrow}
            style={[
              styles.arrowButton,
              {
                backgroundColor: mode === "yuck" ? "#e3d400" : theme.yellow,
                borderColor: theme.black,
              },
            ]}
          >
            <Text style={styles.buttonText}>up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={downArrow}
            style={[
              styles.arrowButton,
              {
                backgroundColor: mode === "yuck" ? "#e3d400" : theme.yellow,
                borderColor: theme.black,
              },
            ]}
          >
            <Text style={styles.buttonText}>down</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={rightArrow}
          style={[
            styles.arrowButton,
            {
              backgroundColor: mode === "yuck" ? "#e3d400" : theme.yellow,
              borderColor: theme.black,
            },
          ]}
        >
          <Text style={styles.buttonText}>right</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  topRow: {
    flexDirection: "row",
    width: "90%",
    marginTop: 20,
    marginBottom: 10,
    alignItems: "center",
    zIndex: 1,
  },
  homeButton: {
    flex: 1,
    alignItems: "flex-start",
    marginLeft: 6,
  },
  modeSelectContainer: {
    flex: 3,
    marginRight: 4,
    alignItems: "flex-end",
  },
  selectModeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 2,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  selectModeText: {
    color: "#000",
    fontSize: 18,
  },
  dropdownIcon: {
    marginLeft: 10,
  },
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
  modeItemText: {
    fontSize: 18,
    color: "#000",
  },
  selectedMode: {
    backgroundColor: "#f0e68c",
  },
  scoreboardContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "90%",
    marginVertical: 10,
  },
  scoreBox: {
    padding: 10,
    width: 150,
    alignItems: "center",
    borderRadius: 5,
  },
  scoreText: {
    color: "#fff",
    fontSize: 16,
  },
  gameArea: {
    borderWidth: 10,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  snake: {
    position: "absolute",
    width: snakeSize,
    height: snakeSize,
  },
  food: {
    position: "absolute",
    width: snakeSize,
    height: snakeSize,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    opacity: 1,
  },
  pauseText: {
    fontSize: 40,
    color: "#fff",
  },
  pauseSubText: {
    fontSize: 30,
    color: "#fff",
  },
  gameOverModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
    pointerEvents: "auto",
  },
  gameOverContent: {
    padding: 20,
    borderRadius: 10,
    borderWidth: 4,
    alignItems: "center",
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    fontFamily: "Arial",
  },
  gameOverText: {
    color: "#fff",
    fontSize: 24,
    marginBottom: 20,
  },
  gameOverButton: {
    paddingVertical: 15,
    paddingHorizontal: 35,
    borderRadius: 5,
    borderWidth: 2,
  },
  gameOverButtonText: {
    color: "#000",
    fontSize: 20,
    fontWeight: "bold",
  },
  buttonsContainer: {
    flexDirection: "row",
    marginTop: (windowHeight - gameAreaHeight) / 50,
    width: gameAreaWidth,
    justifyContent: "space-between",
    alignItems: "stretch",
    flexGrow: 1,
  },
  verticalButtons: {
    flexDirection: "column",
    flex: 1.2,
  },
  arrowButton: {
    borderWidth: 2,
    margin: 5,
    paddingVertical: 18,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 18,
    color: "#000",
  },
});

export default Snake;
