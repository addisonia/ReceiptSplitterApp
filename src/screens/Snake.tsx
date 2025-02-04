/* comments in lowercase */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
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
  infinity: { speed: 15, growthRate: 1000 },
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
  const [homeIconColor, setHomeIconColor] = useState("#e3d400"); // for button highlight

  // references for dynamic settings
  const speedRef = useRef<number>(gameModes[selectedMode].speed);
  const growthRef = useRef<number>(gameModes[selectedMode].growthRate);

  // snake, food, direction, etc.
  // starting the snake at x=snakeSize, y=snakeSize
  const snakeRef = useRef([{ x: 0, y: 0 }]); // Start at top-left corner
  const [showGameOver, setShowGameOver] = useState(false);
  const foodRef = useRef({ x: 0, y: 0 });
  const directionRef = useRef({ x: 0, y: 0 });
  const isPausedRef = useRef(false);
  const lastRenderTimeRef = useRef(0);
  const gameOverRef = useRef(false);

  // keep track of current score in a ref as well
  const scoreRef = useRef(0);
  const highScoreRef = useRef(highScore);


  // just to force re-render of the UI
  const [tick, setTick] = useState(0);

  // load any saved data once at the beginning
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedMode = await AsyncStorage.getItem("selectedMode");
        const savedHighScore = await AsyncStorage.getItem("highScore");
  
        if (savedMode && savedMode in gameModes) {
          setSelectedMode(savedMode as keyof typeof gameModes);
          speedRef.current = gameModes[savedMode].speed;
          growthRef.current = gameModes[savedMode].growthRate;
        }
  
        // if (savedHighScore) {
        //   const parsed = parseInt(savedHighScore, 10);
        //   // only set our local high score to the higher of the two
        //   setHighScore((prev) => Math.max(prev, parsed));
        // }
      } catch (err) {
        console.log("error loading data", err);
      }
    };
  
    loadData();
  }, []);

  // place the food so it’s always at least 1 tile away from edges
  const placeFood = () => {
    const columns = gameAreaWidth / snakeSize;
    const rows = gameAreaHeight / snakeSize;

    // Ensure food is placed 1 tile away from walls
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

  // reset the snake, but keep the mode and high score
  const resetGame = () => {
    snakeRef.current = [{ x: 0, y: 0 }];
    directionRef.current = { x: 0, y: 0 };
    gameOverRef.current = false;
    setShowGameOver(false);
    scoreRef.current = 1;
    placeFood();
  };
  

  const checkCollisions = (head: { x: number; y: number }) => {
    // Adjusted boundaries to account for snake size
    if (
      head.x < 0 ||
      head.x >= gameAreaWidth - snakeSize || // Subtract snakeSize from right boundary
      head.y < 0 ||
      head.y >= gameAreaHeight - snakeSize // Subtract snakeSize from bottom boundary
    ) {
      return true;
    }

    return snakeRef.current
      .slice(1)
      .some((seg) => seg.x === head.x && seg.y === head.y);
  };

// Custom Game Over Modal
const GameOverModal = () => {
    const [isRestartPressed, setIsRestartPressed] = useState(false);
  
    return (
      <View style={styles.gameOverModal}>
        <View style={styles.gameOverContent}>
          <Text style={styles.gameOverTitle}>GAME OVER</Text>
          <Text style={styles.gameOverText}>Score: {scoreRef.current}</Text>
          <TouchableOpacity
            style={[
              styles.gameOverButton,
              { backgroundColor: isRestartPressed ? '#ff4444' : '#e3d400' }
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
            <Text style={styles.gameOverButtonText}>RESTART</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // main game logic step
  const update = () => {
    if (gameOverRef.current) return;
  
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
      AsyncStorage.setItem("currentScore", scoreRef.current.toString());
      for (let i = 0; i < growthRef.current; i++) {
        snakeRef.current.push({
          ...snakeRef.current[snakeRef.current.length - 1],
        });
      }
      placeFood();
  
      // use highScoreRef.current for comparison so it reflects the most recent high score
      if (scoreRef.current > highScoreRef.current) {
        setHighScore(scoreRef.current);
        highScoreRef.current = scoreRef.current; // update the ref as well
        AsyncStorage.setItem("highScore", scoreRef.current.toString());
      }
    } else {
      snakeRef.current.pop();
    }
  };

  // handle continuous animation
  const gameLoop = (currentTime: number) => {
    if (isPausedRef.current || gameOverRef.current) { // Add gameOverRef check
      lastRenderTimeRef.current = currentTime;
      requestAnimationFrame(gameLoop);
      return;
    }
    const secsSinceLast = (currentTime - lastRenderTimeRef.current) / 1000;
    // wait until it's time to move again based on speedRef
    if (speedRef.current > 0 && secsSinceLast < 1 / speedRef.current) {
      requestAnimationFrame(gameLoop);
      return;
    }

    lastRenderTimeRef.current = currentTime;
    update();
    setTick((t) => t + 1);

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
    // place food if not already placed
    placeFood();
    requestAnimationFrame(gameLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // whenever user picks a new mode in the dropdown, store it and reset
  useEffect(() => {
    AsyncStorage.setItem("selectedMode", selectedMode).catch(() => {});
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMode]);

  useEffect(() => {
    AsyncStorage.getItem("highScore").then((val) => {
      if (val) {
        const parsedScore = parseInt(val, 10);
        setHighScore(parsedScore);
        highScoreRef.current = parsedScore; // update our ref too
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

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedMode}
            onValueChange={(val) =>
              handleModeChange(val as keyof typeof gameModes)
            }
            style={styles.picker}
            mode="dropdown"
          >
            <Picker.Item label="Easy" value="easy" />
            <Picker.Item label="Normal" value="normal" />
            <Picker.Item label="Hard" value="hard" />
            <Picker.Item label="IMPOSSIBLE" value="impossible" />
            <Picker.Item
              label="Actually Impossible"
              value="actually_impossible"
            />
            <Picker.Item label="Infinity" value="infinity" />
            <Picker.Item label="Patience" value="patience" />
          </Picker>
        </View>
      </View>

      {/* GameOverModal */}
      {showGameOver && <GameOverModal />}

      {/* scoreboard */}
      <View style={styles.scoreboardContainer}>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>
            Current Score: {scoreRef.current}
          </Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreText}>High Score: {highScore}</Text>
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
          <View
            style={[
              styles.food,
              { left: foodRef.current.x, top: foodRef.current.y },
            ]}
          />
          {isPausedRef.current && (
            <View style={styles.pauseOverlay}>
              <Text style={styles.pauseText}>PAUSED</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* directional buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity onPress={leftArrow} style={styles.arrowButton}>
          <Text style={styles.buttonText}>Left</Text>
        </TouchableOpacity>

        <View style={styles.verticalButtons}>
          <TouchableOpacity onPress={upArrow} style={styles.arrowButton}>
            <Text style={styles.buttonText}>Up</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={downArrow} style={styles.arrowButton}>
            <Text style={styles.buttonText}>Down</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={rightArrow} style={styles.arrowButton}>
          <Text style={styles.buttonText}>Right</Text>
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
  },
  homeButton: {
    flex: 1,
    alignItems: "flex-start",
    marginLeft: 6,
  },
  pickerContainer: {
    flex: 3,
    borderColor: "#000",
    borderWidth: 2,
    backgroundColor: "#e3d400",
    marginRight: 4,
  },
  picker: {
    width: "100%",
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
    marginTop: 10,
    marginBottom: 10,
  },
  verticalButtons: {
    flexDirection: "column",
  },
  arrowButton: {
    backgroundColor: "#e3d400",
    borderWidth: 2,
    borderColor: "#000",
    margin: 5,
    paddingHorizontal: 18,
    paddingVertical: 18,
    minWidth: 60,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 18,
    color: "#000",
  },
});

export default Snake;
