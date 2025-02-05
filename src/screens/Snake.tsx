/* comments in lowercase */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../types/RootStackParams";

const snakeSize = 20;

/* game modes */
const gameModes: Record<string, { speed: number; growthRate: number }> = {
  easy: { speed: 8, growthRate: 4 },
  normal: { speed: 14, growthRate: 3 },
  hard: { speed: 24, growthRate: 1 },
  impossible: { speed: 50, growthRate: 0 },
  actually_impossible: { speed: 0, growthRate: 0 },
  patience: { speed: 1, growthRate: 0 },
};

/* screen dimensions */
const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
/* game area dimensions, snapped to snakeSize */
const gameAreaWidth = Math.floor((windowWidth * 0.9) / snakeSize) * snakeSize;
const gameAreaHeight =
  Math.floor((windowHeight * 0.58) / snakeSize) * snakeSize;

const Snake: React.FC = () => {
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, "Snake">>();

  // persist mode, current score, and high score
  const [selectedMode, setSelectedMode] =
    useState<keyof typeof gameModes>("normal");
  const [highScore, setHighScore] = useState(1);
  const [homeIconColor, setHomeIconColor] = useState("#e3d400");
  const [isModeSelectionOpen, setIsModeSelectionOpen] = useState(false); // state for dropdown visibility


  // snake, food, direction, etc.
  const snakeRef = useRef([{ x: 0, y: 0 }]); // start at top-left corner
  const [showGameOver, setShowGameOver] = useState(false);
  const foodRef = useRef({ x: 0, y: 0 });
  const directionRef = useRef({ x: 0, y: 0 });
  const isPausedRef = useRef(false);
  const lastRenderTimeRef = useRef(0);
  const gameOverRef = useRef(false);

  // keep track of current score in a ref as well
  const scoreRef = useRef(0);
  const highScoreRef = useRef(highScore);

  // add refs for speed and growth rate
  const speedRef = useRef(gameModes[selectedMode].speed);
  const growthRef = useRef(gameModes[selectedMode].growthRate);


  // just to force re-render of the ui
  const [tick, setTick] = useState(0);

  // update refs when mode changes and reset the game
  useEffect(() => {
    speedRef.current = gameModes[selectedMode].speed;
    growthRef.current = gameModes[selectedMode].growthRate;
    AsyncStorage.setItem("selectedMode", selectedMode).catch(() => {});
    resetGame();
  }, [selectedMode]);

  // load any saved data once at the beginning
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedMode = await AsyncStorage.getItem("selectedMode");
        if (savedMode && savedMode in gameModes) {
          // just set the mode; the mode change effect will update the refs
          setSelectedMode(savedMode as keyof typeof gameModes);
        }
      } catch (err) {
        console.log("error loading data", err);
      }
    };

    loadData();
  }, []);

  // place the food so it's always at least 1 tile away from edges
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

  // reset the game, including snake, direction, food, and score
  const resetGame = () => {
    snakeRef.current = [{ x: 0, y: 0 }];
    directionRef.current = { x: 0, y: 0 };
    gameOverRef.current = false;
    setShowGameOver(false);
    scoreRef.current = 1;
    placeFood();
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

  // custom game over modal
  const GameOverModal = () => {
    const [isRestartPressed, setIsRestartPressed] = useState(false);
    return (
      <View style={styles.gameOverModal}>
        <View style={styles.gameOverContent}>
          <Text style={styles.gameOverTitle}>game over</Text>
          <Text style={styles.gameOverText}>score: {scoreRef.current}</Text>
          <TouchableOpacity
            style={[
              styles.gameOverButton,
              { backgroundColor: isRestartPressed ? "#ff4444" : "#e3d400" },
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

  // main game logic step
  const update = () => {
    // if no direction has been set, do nothing so that the snake doesn't move in place
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

    // game modes
    snakeRef.current.unshift(newHead);
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      scoreRef.current += growthRef.current + 1;
      AsyncStorage.setItem("currentScore", scoreRef.current.toString());
      for (let i = 0; i < growthRef.current; i++) {
        snakeRef.current.push({
          ...snakeRef.current[snakeRef.current.length - 1],
        });
      }
      placeFood();

      if (scoreRef.current > highScoreRef.current) {
        setHighScore(scoreRef.current);
        highScoreRef.current = scoreRef.current;
        AsyncStorage.setItem("highScore", scoreRef.current.toString());
      }
    } else {
      snakeRef.current.pop();
    }
    setTick((t) => t + 1);
  };

  // handle continuous animation
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

  // handle directional taps
  const leftArrow = () => {
    if (directionRef.current.x === 0) {
      directionRef.current = { x: -1, y: 0 };
    }
  };
  const upArrow = () => {
    if (directionRef.current.y === 0) {
      directionRef.current = { x: 0, y: -1 };
    }
  };
  const downArrow = () => {
    if (directionRef.current.y === 0) {
      directionRef.current = { x: 0, y: 1 };
    }
  };
  const rightArrow = () => {
    if (directionRef.current.x === 0) {
      directionRef.current = { x: 1, y: 0 };
    }
  };

  // tap the game area to pause/unpause
  const togglePause = () => {
    isPausedRef.current = !isPausedRef.current;
  };

  // run the gameLoop once on startup
  useEffect(() => {
    placeFood();
    requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("highScore").then((val) => {
      if (val) {
        const parsedScore = parseInt(val, 10);
        setHighScore(parsedScore);
        highScoreRef.current = parsedScore;
      }
    });
  }, []);

  // home button
  const goHome = () => {
    setHomeIconColor("#08f800");
    navigation.navigate("MainTabs");
  };

  // handle picking a mode from the dropdown
  const handleModeChange = (mode: keyof typeof gameModes) => {
    setSelectedMode(mode);
    setIsModeSelectionOpen(false); // close the dropdown after mode change
  };


  return (
    <View style={styles.container}>
      {/* top row: home icon on left, picker on right */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={goHome}
          style={styles.homeButton}
          onPressIn={() => setHomeIconColor("#08f800")}
          onPressOut={() => setHomeIconColor("#e3d400")}
        >
          <Icon name="home" size={30} color={homeIconColor} />
        </TouchableOpacity>

        <View style={styles.modeSelectContainer}>
          <TouchableOpacity
            style={styles.selectModeButton}
            onPress={() => setIsModeSelectionOpen(!isModeSelectionOpen)}
          >
            <Text style={styles.selectModeText}>{selectedMode.replace('_', ' ')}</Text>
            <Icon
              name={isModeSelectionOpen ? "caret-up" : "caret-down"}
              size={20}
              color="#000"
              style={styles.dropdownIcon}
            />
          </TouchableOpacity>

          {/* mode selection "dropdown" */}
          {isModeSelectionOpen && (
            <View style={styles.modeDropdown}>
              {Object.keys(gameModes).map((mode, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modeDropDownItem,
                    selectedMode === mode ? styles.selectedMode : null,
                  ]}
                  onPress={() => handleModeChange(mode as keyof typeof gameModes)}
                >
                  <Text style={styles.modeItemText}>{mode.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* game over modal */}
      {showGameOver && <GameOverModal />}

      {/* scoreboard */}
      <View style={styles.scoreboardContainer}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>
            current score: {scoreRef.current}
          </Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>high score: {highScore}</Text>
        </View>
      </View>

      {/* game area (tap to pause) */}
      <TouchableWithoutFeedback onPress={togglePause}>
        <View
          style={[
            styles.gameArea,
            { width: gameAreaWidth, height: gameAreaHeight },
          ]}
        >
          {snakeRef.current.map((segment, index) => (
            <View
              key={index}
              style={[styles.snake, { left: segment.x, top: segment.y }]}
            />
          ))}
          {/* food */}
          <View
            style={[styles.food, { left: foodRef.current.x, top: foodRef.current.y }]}
          />
          {isPausedRef.current && (
            <View style={styles.pauseOverlay}>
              <Text style={styles.pauseText}>paused</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* directional buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity onPress={leftArrow} style={styles.arrowButton}>
          <Text style={styles.buttonText}>left</Text>
        </TouchableOpacity>

        <View style={styles.verticalButtons}>
          <TouchableOpacity onPress={upArrow} style={styles.arrowButton}>
            <Text style={styles.buttonText}>up</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={downArrow} style={styles.arrowButton}>
            <Text style={styles.buttonText}>down</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={rightArrow} style={styles.arrowButton}>
          <Text style={styles.buttonText}>right</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* comments in lowercase */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#5c540b",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  topRow: {
    flexDirection: "row",
    width: "90%",
    marginTop: 20,
    marginBottom: 10,
    alignItems: "center",
    zIndex: 1, // Ensure top row elements are above dropdown
  },
  homeButton: {
    flex: 1,
    alignItems: "flex-start",
    marginLeft: 6,
  },
  modeSelectContainer: {
    flex: 3,
    marginRight: 4,
    alignItems: 'flex-end', // Align button to the right
  },
  selectModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: "#000",
    borderWidth: 2,
    backgroundColor: "#e3d400",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  selectModeText: {
    color: '#000',
    fontSize: 18,
  },
  dropdownIcon: {
    marginLeft: 10,
  },
  modeDropdown: {
    position: 'absolute',
    top: 45, // Adjust as needed to position below the button
    right: 0,
    width: '100%', // Match button width
    backgroundColor: '#e3d400',
    borderColor: '#000',
    borderWidth: 2,
    borderRadius: 5,
    marginTop: 5,
    zIndex: 2, // Ensure dropdown is above other elements
  },
  modeDropDownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  modeItemText: {
    fontSize: 18,
    color: '#000',
  },
  selectedMode: {
    backgroundColor: '#f0e68c', // Slightly darker yellow for selected item
  },
  scoreboardContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "90%",
    marginVertical: 10,
  },
  scoreBox: {
    backgroundColor: "#2e2b3d",
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
    backgroundColor: "#9e9b7b",
    borderColor: "#2e2b3d",
    borderWidth: 10,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  snake: {
    position: "absolute",
    width: snakeSize,
    height: snakeSize,
    backgroundColor: "#2e2b3d",
  },
  food: {
    position: "absolute",
    width: snakeSize,
    height: snakeSize,
    backgroundColor: "#b6390b",
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  pauseText: {
    fontSize: 40,
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
    backgroundColor: "#5c540b",
    padding: 20,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: "#e3d400",
    alignItems: "center",
  },
  gameOverTitle: {
    color: "#e3d400",
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
    backgroundColor: "#e3d400",
    paddingVertical: 15,
    paddingHorizontal: 35,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#000",
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
    justifyContent: 'space-between',
    alignItems: 'stretch',
    flexGrow: 1,
  },
  verticalButtons: {
    flexDirection: "column",
    flex: 1,
  },
  arrowButton: {
    backgroundColor: "#e3d400",
    borderWidth: 2,
    borderColor: "#000",
    margin: 5,
    paddingVertical: 18,
    flex: 1,
    alignItems: "center",
  },

  buttonText: {
    fontSize: 18,
    color: "#000",
  },
});

export default Snake;