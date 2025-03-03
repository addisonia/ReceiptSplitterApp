/* comments in lowercase */
import React, { useState, useEffect, useRef } from "react";
/* import react, usestate, useeffect, and useref hooks from react library */
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
/* import necessary components from react-native library */
import Icon from "react-native-vector-icons/FontAwesome";
/* import icon component from react-native-vector-icons/fontawesome library */
import { Picker } from "@react-native-picker/picker";
/* import picker component from @react-native-picker/picker library */
import { useNavigation } from "@react-navigation/native";
/* import usenavigation hook from @react-navigation/native library */
import { StackNavigationProp } from "@react-navigation/stack";
/* import stacknavigationprop type from @react-navigation/stack library */
import AsyncStorage from "@react-native-async-storage/async-storage";
/* import asyncstorage from @react-native-async-storage/async-storage library */
import { RootStackParamList } from "../types/RootStackParams";
/* import rootstackparamlist type from types/rootstackparams file */
import { colors } from "../components/ColorThemes";

const snakeSize = 20;
/* define the size of each snake segment and food */

/* game modes */
const gameModes: Record<string, { speed: number; growthRate: number }> = {
  easy: { speed: 8, growthRate: 4 },
  normal: { speed: 14, growthRate: 3 },
  hard: { speed: 24, growthRate: 1 },
  impossible: { speed: 50, growthRate: 0 },
  actually_impossible: { speed: 0, growthRate: 0 },
  patience: { speed: 1, growthRate: 0 },
};
/* define different game modes with their respective speeds and growth rates */

/* screen dimensions */
const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
/* get window width and height from dimensions api */
/* game area dimensions, snapped to snakeSize */
const gameAreaWidth = Math.floor((windowWidth * 0.9) / snakeSize) * snakeSize;
/* calculate game area width, taking 90% of window width and snapping to snake size */
const gameAreaHeight =
  Math.floor((windowHeight * 0.58) / snakeSize) * snakeSize;
/* calculate game area height, taking 58% of window height and snapping to snake size */

const Snake: React.FC = () => {
  /* define the snake functional component */
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, "Snake">>();
  /* initialize navigation object using usenavigation hook with type for snake screen */

  // persist mode, current score, and high score
  const [selectedMode, setSelectedMode] =
    useState<keyof typeof gameModes>("normal");
  /* usestate hook to manage selected game mode, default is 'normal' */
  const [highScore, setHighScore] = useState(1);
  /* usestate hook to manage high score, default is 1 */
  const [homeIconColor, setHomeIconColor] = useState("#e3d400");
  /* usestate hook to manage home icon color, default is yellow-ish */
  const [isModeSelectionOpen, setIsModeSelectionOpen] = useState(false); // state for dropdown visibility
  /* usestate hook to manage mode selection dropdown visibility, default is closed */

  // snake, food, direction, etc.
  const snakeRef = useRef([{ x: 0, y: 0 }]); // start at top-left corner
  /* useref hook to manage snake body as array of coordinates, starts with one segment at top-left */
  const [showGameOver, setShowGameOver] = useState(false);
  /* usestate hook to manage game over modal visibility, default is hidden */
  const foodRef = useRef({ x: 0, y: 0 });
  /* useref hook to manage food position as x and y coordinates */
  const directionRef = useRef({ x: 0, y: 0 });
  /* useref hook to manage snake direction as x and y components, default is no movement */
  const isPausedRef = useRef(false);
  /* useref hook to manage game pause state, default is not paused */
  const lastRenderTimeRef = useRef(0);
  /* useref hook to manage last render time for controlling game speed */
  const gameOverRef = useRef(false);
  /* useref hook to manage game over state, default is not game over */

  // keep track of current score in a ref as well
  const scoreRef = useRef(0);
  /* useref hook to manage current score, default is 0 */
  const highScoreRef = useRef(highScore);
  /* useref hook to manage high score in ref, initialized with usestate highscore */

  // add refs for speed and growth rate
  const speedRef = useRef(gameModes[selectedMode].speed);
  /* useref hook to manage game speed, initialized with speed from selected mode */
  const growthRef = useRef(gameModes[selectedMode].growthRate);
  /* useref hook to manage snake growth rate, initialized with growth rate from selected mode */

  // just to force re-render of the ui
  const [tick, setTick] = useState(0);
  /* usestate hook to force re-render the component on game updates */
  const [pauseTick, setPauseTick] = useState(0); // NEW state for pause re-render
  /* usestate hook to force re-render component when game is paused/unpaused */

  // update refs when mode changes and reset the game
  useEffect(() => {
    /* useeffect hook to run when selectedmode changes */
    speedRef.current = gameModes[selectedMode].speed;
    /* update speed ref with speed from the newly selected game mode */
    growthRef.current = gameModes[selectedMode].growthRate;
    /* update growth rate ref with growth rate from the newly selected game mode */
    AsyncStorage.setItem("selectedMode", selectedMode).catch(() => {});
    /* save the selected mode to asyncstorage for persistence */
    resetGame();
    /* reset the game to apply new mode settings */
  }, [selectedMode]);
  /* dependency array: effect runs when selectedmode changes */

  // load any saved data once at the beginning
  useEffect(() => {
    /* useeffect hook to load saved data when component mounts */
    const loadData = async () => {
      /* define async function to load data */
      try {
        /* try block for async storage operations */
        const savedMode = await AsyncStorage.getItem("selectedMode");
        /* get saved game mode from asyncstorage */
        if (savedMode && savedMode in gameModes) {
          // just set the mode; the mode change effect will update the refs
          setSelectedMode(savedMode as keyof typeof gameModes);
          /* if saved mode exists and is valid, set selected mode, which triggers mode change effect */
        }
      } catch (err) {
        /* catch block for error handling during data loading */
        console.log("error loading data", err);
        /* log error if loading data fails */
      }
    };

    loadData();
    /* call load data function to execute data loading */
  }, []);
  /* dependency array: effect runs only once on component mount */

  // place the food so it's always at least 1 tile away from edges
  const placeFood = () => {
    /* function to place food at a random position within the game area, away from edges and snake */
    const columns = gameAreaWidth / snakeSize;
    /* calculate number of columns in the game area */
    const rows = gameAreaHeight / snakeSize;
    /* calculate number of rows in the game area */

    let minX = 1;
    /* minimum column index for food placement (1 tile away from left edge) */
    let minY = 1;
    /* minimum row index for food placement (1 tile away from top edge) */
    let maxX = columns - 2;
    /* maximum column index for food placement (1 tile away from right edge) */
    let maxY = rows - 2;
    /* maximum row index for food placement (1 tile away from bottom edge) */

    let newFood: { x: number; y: number };
    /* declare variable to hold new food coordinates */
    do {
      /* do-while loop to ensure food is not placed on the snake */
      const fx =
        Math.floor(Math.random() * (maxX - minX + 1) + minX) * snakeSize;
      /* calculate random x coordinate for food within allowed range and snapped to snake size */
      const fy =
        Math.floor(Math.random() * (maxY - minY + 1) + minY) * snakeSize;
      /* calculate random y coordinate for food within allowed range and snapped to snake size */
      newFood = { x: fx, y: fy };
      /* create new food coordinate object */
    } while (
      snakeRef.current.some((seg) => seg.x === newFood.x && seg.y === newFood.y)
    );
    /* condition for do-while loop: repeat if food position overlaps with any snake segment */

    foodRef.current = newFood;
    /* update food ref with the newly generated food coordinates */
  };

  // reset the game, including snake, direction, food, and score
  const resetGame = () => {
    /* function to reset the game state to initial values */
    snakeRef.current = [{ x: 0, y: 0 }];
    /* reset snake to initial position (single segment at top-left) */
    directionRef.current = { x: 0, y: 0 };
    /* reset snake direction to no movement */
    gameOverRef.current = false;
    /* reset game over state to false */
    setShowGameOver(false);
    /* hide game over modal */
    scoreRef.current = 1;
    /* reset current score to 1 */
    placeFood();
    /* place food at a new random position */
    setTick(
      (t) => t + 1
    ); /* force re-render to update food position immediately after mode change */
  };

  const checkCollisions = (head: { x: number; y: number }) => {
    /* function to check for collisions of snake head with walls or its own body */
    if (
      head.x < 0 ||
      head.x >= gameAreaWidth - snakeSize ||
      head.y < 0 ||
      head.y >= gameAreaHeight - snakeSize
    ) {
      /* check if head x or y coordinates are outside game area bounds */
      return true;
      /* return true if collision with wall is detected */
    }
    return snakeRef.current
      .slice(1)
      .some((seg) => seg.x === head.x && seg.y === head.y);
    /* check if head position overlaps with any segment of the snake body (excluding head itself) */
  };

  // custom game over modal
  const GameOverModal = () => {
    /* game over modal component */
    const [isRestartPressed, setIsRestartPressed] = useState(false);
    /* usestate hook to manage restart button press state for visual feedback */
    return (
      /* return game over modal view */
      <View style={styles.gameOverModal}>
        {/* container for game over modal */}
        <View style={styles.gameOverContent}>
          {/* content area of game over modal */}
          <Text style={styles.gameOverTitle}>game over</Text>
          {/* game over title text */}
          <Text style={styles.gameOverText}>score: {scoreRef.current}</Text>
          {/* display current score in game over modal */}
          <TouchableOpacity
            /* restart button */
            style={[
              styles.gameOverButton,
              { backgroundColor: isRestartPressed ? "#ff4444" : "#e3d400" },
            ]}
            /* style for restart button, changes color when pressed */
            onPressIn={() => setIsRestartPressed(true)}
            /* set restart button pressed state to true on press in */
            onPressOut={() => setIsRestartPressed(false)}
            /* set restart button pressed state to false on press out */
            onPress={() => {
              /* on press action for restart button */
              gameOverRef.current = false;
              /* reset game over ref to false */
              resetGame();
              /* call resetgame function to start a new game */
            }}
            activeOpacity={1}
            /* set active opacity to 1 for no opacity change on press */
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            /* increase touchable area for restart button */
          >
            <Text style={styles.gameOverButtonText}>restart</Text>
            {/* restart button text */}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // main game logic step
  const update = () => {
    /* main game update function, called in each game loop iteration */
    // if no direction has been set, do nothing so that the snake doesn't move in place
    if (directionRef.current.x === 0 && directionRef.current.y === 0) {
      /* if no direction is set (game just started or direction reset), do nothing */
      return;
      /* exit update function if no direction is set */
    }

    const currentHead = snakeRef.current[0];
    /* get current snake head segment */
    const newHead = {
      x: currentHead.x + directionRef.current.x * snakeSize,
      y: currentHead.y + directionRef.current.y * snakeSize,
    };
    /* calculate new head position based on current head and direction */

    if (checkCollisions(newHead)) {
      /* check if new head position causes a collision */
      gameOverRef.current = true;
      /* set game over ref to true if collision detected */
      setShowGameOver(true);
      /* show game over modal */
      return;
      /* exit update function if game over */
    }

    // game modes
    snakeRef.current.unshift(newHead);
    /* add new head segment to the beginning of snake body array, effectively moving snake */
    if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
      /* check if new head position is same as food position (snake ate food) */
      scoreRef.current += growthRef.current + 1;
      /* increase current score by growth rate + 1 */
      AsyncStorage.setItem("currentScore", scoreRef.current.toString());
      /* save current score to asyncstorage */
      for (let i = 0; i < growthRef.current; i++) {
        /* loop for growth rate times */
        snakeRef.current.push({
          ...snakeRef.current[snakeRef.current.length - 1],
        });
        /* add a new segment to the end of the snake for each growth unit */
      }
      placeFood();
      /* place food at a new random position */

      if (scoreRef.current > highScoreRef.current) {
        /* check if current score is greater than high score */
        setHighScore(scoreRef.current);
        /* update high score usestate */
        highScoreRef.current = scoreRef.current;
        /* update high score ref */
        AsyncStorage.setItem("highScore", scoreRef.current.toString());
        /* save new high score to asyncstorage */
      }
    } else {
      /* if snake did not eat food */
      snakeRef.current.pop();
      /* remove the last segment of the snake, keeping snake length constant (unless food eaten) */
    }
    setTick((t) => t + 1);
    /* force re-render to update ui with new snake and food positions */
  };

  // handle continuous animation
  const gameLoop = (currentTime: number) => {
    /* main game loop function, using requestanimationframe for smooth animation */
    if (isPausedRef.current || gameOverRef.current) {
      /* if game is paused or game over */
      lastRenderTimeRef.current = currentTime;
      /* update last render time, but don't update game state */
      requestAnimationFrame(gameLoop);
      /* request next animation frame to keep loop running for pause/gameover state */
      return;
      /* exit gameloop function if paused or game over */
    }
    const secsSinceLast = (currentTime - lastRenderTimeRef.current) / 1000;
    /* calculate seconds elapsed since last render frame */
    if (speedRef.current > 0 && secsSinceLast < 1 / speedRef.current) {
      /* if game speed is not 0 and time since last frame is less than required for current speed */
      requestAnimationFrame(gameLoop);
      /* request next animation frame without updating game state to control speed */
      return;
      /* exit gameloop function to limit frame rate based on game speed */
    }
    lastRenderTimeRef.current = currentTime;
    /* update last render time to current time */
    update();
    /* call update function to move snake, check collisions, etc. */
    requestAnimationFrame(gameLoop);
    /* request next animation frame to continue the game loop */
  };

  // handle directional taps
  const leftArrow = () => {
    /* function to handle left arrow button press */
    if (directionRef.current.x === 0) {
      /* check if current direction is not already horizontal */
      directionRef.current = { x: -1, y: 0 };
      /* set direction to left (-1 x, 0 y) */
    }
  };
  const upArrow = () => {
    /* function to handle up arrow button press */
    if (directionRef.current.y === 0) {
      /* check if current direction is not already vertical */
      directionRef.current = { x: 0, y: -1 };
      /* set direction to up (0 x, -1 y) */
    }
  };
  const downArrow = () => {
    /* function to handle down arrow button press */
    if (directionRef.current.y === 0) {
      /* check if current direction is not already vertical */
      directionRef.current = { x: 0, y: 1 };
      /* set direction to down (0 x, 1 y) */
    }
  };
  const rightArrow = () => {
    /* function to handle right arrow button press */
    if (directionRef.current.x === 0) {
      /* check if current direction is not already horizontal */
      directionRef.current = { x: 1, y: 0 };
      /* set direction to right (1 x, 0 y) */
    }
  };

  // tap the game area to pause/unpause
  const togglePause = () => {
    /* function to toggle pause state of the game */
    isPausedRef.current = !isPausedRef.current;
    /* toggle pause state in ref */
    setPauseTick((pt) => pt + 1); // Force re-render by updating pauseTick (NEW LINE)
    /* force re-render to show/hide pause overlay */
  };

  // run the gameLoop once on startup
  useEffect(() => {
    /* useeffect hook to start game loop and place initial food on component mount */
    placeFood();
    /* place food at initial position */
    requestAnimationFrame(gameLoop);
    /* start the game loop animation */
  }, []);
  /* dependency array: effect runs only once on component mount */

  useEffect(() => {
    /* useeffect hook to load high score from asyncstorage on component mount */
    AsyncStorage.getItem("highScore").then((val) => {
      /* get highscore from asyncstorage */
      if (val) {
        /* if highscore value exists in asyncstorage */
        const parsedScore = parseInt(val, 10);
        /* parse highscore value from string to integer */
        setHighScore(parsedScore);
        /* set highscore usestate with parsed value */
        highScoreRef.current = parsedScore;
        /* update highscore ref with parsed value */
      }
    });
  }, []);
  /* dependency array: effect runs only once on component mount */

  // home button
  const goHome = () => {
    /* function to navigate to main tabs screen */
    setHomeIconColor("#08f800");
    /* set home icon color to green on press in */
    navigation.navigate("MainTabs", { screen: "Home" }); // Navigate to 'Home' tab
    /* navigate to maintabs screen using navigation object */
  };

  // handle picking a mode from the dropdown
  const handleModeChange = (mode: keyof typeof gameModes) => {
    /* function to handle mode selection from dropdown */
    setSelectedMode(mode);
    /* set selected mode usestate to the chosen mode */
    setIsModeSelectionOpen(false); // close the dropdown after mode change
    /* close the mode selection dropdown */
  };

  return (
    /* return the main view for the snake game component */
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.yuck} />

      {/* main container view */}
      {/* top row: home icon on left, picker on right */}
      <View style={styles.topRow}>
        {/* top row container for home button and mode selector */}
        <TouchableOpacity
          /* home button touchable opacity */
          onPress={goHome}
          /* on press, navigate to home screen */
          style={styles.homeButton}
          /* style for home button */
          onPressIn={() => setHomeIconColor("#08f800")}
          /* set home icon color to green on press in */
          onPressOut={() => setHomeIconColor("#e3d400")}
          /* set home icon color back to yellow-ish on press out */
        >
          <Icon name="home" size={30} color={homeIconColor} />
          {/* home icon component */}
        </TouchableOpacity>

        <View style={styles.modeSelectContainer}>
          {/* container for mode selection button and dropdown */}
          <TouchableOpacity
            style={styles.selectModeButton}
            /* style for select mode button */
            onPress={() => setIsModeSelectionOpen(!isModeSelectionOpen)}
            /* toggle mode selection dropdown visibility on press */
          >
            <Text style={styles.selectModeText}>
              {selectedMode.replace("_", " ")}
            </Text>
            {/* text displaying currently selected mode */}
            <Icon
              name={isModeSelectionOpen ? "caret-up" : "caret-down"}
              /* icon for dropdown, changes based on dropdown visibility */
              size={20}
              color="#000"
              style={styles.dropdownIcon}
              /* style for dropdown icon */
            />
          </TouchableOpacity>

          {/* mode selection "dropdown" */}
          {isModeSelectionOpen && (
            /* conditionally render mode dropdown based on visibility state */
            <View style={styles.modeDropdown}>
              {/* container for mode dropdown */}
              {Object.keys(gameModes).map((mode, index) => (
                /* map over game modes to create dropdown items */
                <TouchableOpacity
                  /* touchable opacity for each mode in dropdown */
                  key={index}
                  /* unique key for each mode item */
                  style={[
                    styles.modeDropDownItem,
                    selectedMode === mode ? styles.selectedMode : null,
                  ]}
                  /* style for each mode item, highlights selected mode */
                  onPress={() =>
                    handleModeChange(mode as keyof typeof gameModes)
                  }
                  /* on press, call handlemodechange to set selected mode */
                >
                  <Text style={styles.modeItemText}>
                    {mode.replace("_", " ")}
                  </Text>
                  {/* text displaying game mode name in dropdown */}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* game over modal */}
      {showGameOver && <GameOverModal />}
      {/* conditionally render gameovermodal component when gameover is true */}

      {/* scoreboard */}
      <View style={styles.scoreboardContainer}>
        {/* container for scoreboard */}
        <View style={styles.scoreBox}>
          {/* container for current score display */}
          <Text style={styles.scoreText}>
            current score: {scoreRef.current}
          </Text>
          {/* text displaying current score */}
        </View>
        <View style={styles.scoreBox}>
          {/* container for high score display */}
          <Text style={styles.scoreText}>high score: {highScore}</Text>
          {/* text displaying high score */}
        </View>
      </View>

      {/* game area (tap to pause) */}
      <TouchableWithoutFeedback onPress={togglePause}>
        {/* touchablewithoutfeedback to detect taps on game area for pausing */}
        <View
          style={[
            styles.gameArea,
            { width: gameAreaWidth, height: gameAreaHeight },
          ]}
          /* style for game area, setting width and height dynamically */
        >
          {snakeRef.current.map((segment, index) => (
            /* map over snake segments to render each segment */
            <View
              /* view for each snake segment */
              key={index}
              /* unique key for each snake segment */
              style={[styles.snake, { left: segment.x, top: segment.y }]}
              /* style for snake segment, positioning it based on segment coordinates */
            />
          ))}
          {/* food */}
          <View
            /* view for food */
            style={[
              styles.food,
              { left: foodRef.current.x, top: foodRef.current.y },
            ]}
            /* style for food, positioning it based on food coordinates */
          />
          {isPausedRef.current && (
            /* conditionally render pause overlay when game is paused */
            <View style={styles.pauseOverlay} key={pauseTick}>
              {/* container for pause overlay, key forces re-render on pause state change */}
              <Text style={styles.pauseText}>paused</Text>
              {/* text displaying 'paused' in overlay */}
              <Text style={styles.pauseSubText}>(tap to unpause)</Text>
              {/* subtext in pause overlay explaining how to unpause */}
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* directional buttons */}
      <View style={styles.buttonsContainer}>
        {/* container for directional buttons */}
        <TouchableOpacity onPress={leftArrow} style={styles.arrowButton}>
          {/* left arrow button touchable opacity, onpress calls leftarrow function */}
          <Text style={styles.buttonText}>left</Text>
          {/* text for left arrow button */}
        </TouchableOpacity>

        <View style={styles.verticalButtons}>
          {/* container for vertical arrow buttons (up and down) */}
          <TouchableOpacity onPress={upArrow} style={styles.arrowButton}>
            {/* up arrow button touchable opacity, onpress calls uparrow function */}
            <Text style={styles.buttonText}>up</Text>
            {/* text for up arrow button */}
          </TouchableOpacity>
          <TouchableOpacity onPress={downArrow} style={styles.arrowButton}>
            {/* down arrow button touchable opacity, onpress calls downarrow function */}
            <Text style={styles.buttonText}>down</Text>
            {/* text for down arrow button */}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={rightArrow} style={styles.arrowButton}>
          {/* right arrow button touchable opacity, onpress calls rightarrow function */}
          <Text style={styles.buttonText}>right</Text>
          {/* text for right arrow button */}
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* comments in lowercase */
const styles = StyleSheet.create({
  /* stylesheet for snake component */
  container: {
    /* container style */
    flex: 1,
    backgroundColor: "#5c540b",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  topRow: {
    /* top row style for home button and mode selector */
    flexDirection: "row",
    width: "90%",
    marginTop: 20,
    marginBottom: 10,
    alignItems: "center",
    zIndex: 1, // Ensure top row elements are above dropdown
  },
  homeButton: {
    /* home button style */
    flex: 1,
    alignItems: "flex-start",
    marginLeft: 6,
  },
  modeSelectContainer: {
    /* mode select container style */
    flex: 3,
    marginRight: 4,
    alignItems: "flex-end", // Align button to the right
  },
  selectModeButton: {
    /* select mode button style */
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: "#000",
    borderWidth: 2,
    backgroundColor: "#e3d400",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  selectModeText: {
    /* select mode text style */
    color: "#000",
    fontSize: 18,
  },
  dropdownIcon: {
    /* dropdown icon style */
    marginLeft: 10,
  },
  modeDropdown: {
    /* mode dropdown style */
    position: "absolute",
    top: 45, // Adjust as needed to position below the button
    right: 0,
    width: "100%", // Match button width
    backgroundColor: "#e3d400",
    borderColor: "#000",
    borderWidth: 2,
    borderRadius: 5,
    marginTop: 5,
    zIndex: 2, // Ensure dropdown is above other elements
  },
  modeDropDownItem: {
    /* mode dropdown item style */
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  modeItemText: {
    /* mode dropdown item text style */
    fontSize: 18,
    color: "#000",
  },
  selectedMode: {
    /* selected mode item style in dropdown */
    backgroundColor: "#f0e68c", // Slightly darker yellow for selected item
  },
  scoreboardContainer: {
    /* scoreboard container style */
    flexDirection: "row",
    justifyContent: "space-around",
    width: "90%",
    marginVertical: 10,
  },
  scoreBox: {
    /* score box style */
    backgroundColor: "#2e2b3d",
    padding: 10,
    width: 150,
    alignItems: "center",
    borderRadius: 5,
  },
  scoreText: {
    /* score text style */
    color: "#fff",
    fontSize: 16,
  },
  gameArea: {
    /* game area style */
    backgroundColor: "#9e9b7b",
    borderColor: "#2e2b3d",
    borderWidth: 10,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  snake: {
    /* snake segment style */
    position: "absolute",
    width: snakeSize,
    height: snakeSize,
    backgroundColor: "#2e2b3d",
  },
  food: {
    /* food style */
    position: "absolute",
    width: snakeSize,
    height: snakeSize,
    backgroundColor: "#b6390b",
  },
  pauseOverlay: {
    /* pause overlay style */
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgb(255, 141, 141)",
    justifyContent: "center",
    alignItems: "center",
    opacity: 1,
  },
  pauseText: {
    /* pause text style */
    fontSize: 40,
    color: "#fff",
  },
  pauseSubText: {
    /* pause subtext style */
    fontSize: 30,
    color: "#fff",
  },
  gameOverModal: {
    /* game over modal style */
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
    pointerEvents: "auto",
  },
  gameOverContent: {
    /* game over content style */
    backgroundColor: "#5c540b",
    padding: 20,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: "#e3d400",
    alignItems: "center",
  },
  gameOverTitle: {
    /* game over title style */
    color: "#e3d400",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    fontFamily: "Arial",
  },
  gameOverText: {
    /* game over text style */
    color: "#fff",
    fontSize: 24,
    marginBottom: 20,
  },
  gameOverButton: {
    /* game over button style */
    backgroundColor: "#e3d400",
    paddingVertical: 15,
    paddingHorizontal: 35,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#000",
  },
  gameOverButtonText: {
    /* game over button text style */
    color: "#000",
    fontSize: 20,
    fontWeight: "bold",
  },
  buttonsContainer: {
    /* buttons container style */
    flexDirection: "row",
    marginTop: (windowHeight - gameAreaHeight) / 50,
    width: gameAreaWidth,
    justifyContent: "space-between",
    alignItems: "stretch",
    flexGrow: 1,
  },
  verticalButtons: {
    /* vertical buttons container style */
    flexDirection: "column",
    flex: 1.2,
  },
  arrowButton: {
    /* arrow button style */
    backgroundColor: "#e3d400",
    borderWidth: 2,
    borderColor: "#000",
    margin: 5,
    paddingVertical: 18,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    /* button text style */
    fontSize: 18,
    color: "#000",
  },
});

export default Snake;
/* export the snake component as default export */
