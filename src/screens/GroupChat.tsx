// screens/GroupChat.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Easing,
} from "react-native";
import colors from "../../constants/colors";
import { ref, onValue, push, set, get, update } from "firebase/database";
import { auth, database } from "../firebase";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface Friend {
  uid: string;
  username: string;
}

const GroupChat = () => {
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupCreatedMessage, setGroupCreatedMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // track if we need to shake the group name box
  const [shakeName, setShakeName] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // track button press for color change
  const [isPressed, setIsPressed] = useState(false);

  const navigation = useNavigation();

  // run a quick shake animation if needed
  useEffect(() => {
    if (shakeName) {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10, // move to the right
          duration: 50,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10, // move to the left
          duration: 50,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0, // back to original
          duration: 50,
          useNativeDriver: true,
          easing: Easing.linear,
        }),
      ]).start(() => {
        setShakeName(false);
      });
    }
  }, [shakeName, shakeAnim]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const friendsRef = ref(database, `users/${currentUser.uid}/friends`);
    const unsubscribe = onValue(friendsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const friendList: Friend[] = Object.entries(data).map(
          ([friendUid, friendName]) => ({
            uid: friendUid,
            username: typeof friendName === "string" ? friendName : "Unknown",
          })
        );
        setFriends(friendList);
      } else {
        setFriends([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleFriend = (friendUid: string) => {
    if (selectedFriends.includes(friendUid)) {
      setSelectedFriends(selectedFriends.filter((id) => id !== friendUid));
    } else {
      setSelectedFriends([...selectedFriends, friendUid]);
    }
  };

  const createGroupChat = async () => {
    setErrorMessage("");

    // 1) check for empty name
    if (!groupName.trim()) {
      setShakeName(true);
      setErrorMessage("");
      return;
    }

    // 2) check if fewer than 2 friends selected
    // => total participants < 3 => you + only 1 friend => not a "group"
    if (selectedFriends.length < 2) {
      setErrorMessage("Please select more than 1 user to create a group chat");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // gather all participants (including yourself)
    const participantsSet = new Set([...selectedFriends, currentUser.uid]);
    // store them as an object => { uid: true }
    const participantsObj = {} as Record<string, boolean>;
    participantsSet.forEach((p) => (participantsObj[p] = true));

    // check if a group with these exact participants already exists
    try {
      const allGroupsSnap = await get(ref(database, "groupChats"));
      if (allGroupsSnap.exists()) {
        const allGroupsData = allGroupsSnap.val();
        // find if any group has exactly these participants
        for (const [gid, gval] of Object.entries(allGroupsData)) {
          if (typeof gval === "object" && gval !== null) {
            const val = gval as {
              name: string;
              creator: string;
              participants: Record<string, boolean>;
            };
            // compare participants
            if (haveSameParticipants(val.participants, participantsObj)) {
              Alert.alert(
                "Group Already Exists",
                "A group chat with these users already exists. Would you like to rename it?",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Yes",
                    onPress: async () => {
                      await update(ref(database, `groupChats/${gid}`), {
                        name: groupName.trim(),
                      });
                      showSuccessBubble(`Renamed group to "${groupName.trim()}"`);
                    },
                  },
                ]
              );
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking existing groups:", error);
    }

    // create a new group
    const groupChatsRef = ref(database, "groupChats");
    const newGroupRef = push(groupChatsRef);
    const groupId = newGroupRef.key; 
    if (!groupId) return;

    // write group info
    await set(newGroupRef, {
      name: groupName.trim(),
      creator: currentUser.uid,
      participants: participantsObj,
    });

    // store the group ref under each participant
    for (const uid of participantsSet) {
      await set(ref(database, `users/${uid}/groups/${groupId}`), true);
    }

    showSuccessBubble(`Group Chat "${groupName.trim()}" Created`);
    setGroupName("");
    setSelectedFriends([]);
  };

  // show success bubble for 3s
  const showSuccessBubble = (msg: string) => {
    setGroupCreatedMessage(msg);
    setTimeout(() => {
      setGroupCreatedMessage("");
    }, 3000);
  };

  // compare participants
  const haveSameParticipants = (
    p1: Record<string, boolean>,
    p2: Record<string, boolean>
  ) => {
    const keys1 = Object.keys(p1).sort();
    const keys2 = Object.keys(p2).sort();
    if (keys1.length !== keys2.length) return false;
    return keys1.every((k, i) => k === keys2[i]);
  };

  return (
    <View style={styles.container}>
      {/* header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backArrowWrapper}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5
            name="arrow-left"
            size={24}
            color={colors.yellow}
            style={{ marginRight: 10 }}
          />
        </TouchableOpacity>
        <Text style={styles.header}>Create Group Chat</Text>
        <View style={{ width: 24, marginLeft: 10 }} />
      </View>

      {/* card container */}
      <View style={styles.card}>
        <Text style={styles.label}>Group Name</Text>
        <Animated.View
          style={[
            {
              transform: [{ translateX: shakeAnim }],
            },
          ]}
        >
          <TextInput
            style={[
              styles.groupInput,
              !groupName.trim() ? styles.groupInputError : {},
            ]}
            placeholder="My Fun Group"
            placeholderTextColor="#ccc"
            value={groupName}
            onChangeText={setGroupName}
          />
        </Animated.View>

        {friends.length === 0 ? (
          <Text style={styles.noFriendsText}>You have no friends yet.</Text>
        ) : (
          <>
            <Text style={styles.label}>Select Friends</Text>
            <ScrollView style={styles.scrollArea}>
              {friends.map((friend) => {
                const isSelected = selectedFriends.includes(friend.uid);
                return (
                  <TouchableOpacity
                    key={friend.uid}
                    style={[
                      styles.friendRow,
                      isSelected && styles.friendRowSelected,
                    ]}
                    onPress={() => toggleFriend(friend.uid)}
                  >
                    <Text style={styles.friendName}>{friend.username}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* error bubble if needed */}
        {errorMessage !== "" && (
          <View style={styles.errorBubble}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.createButton,
            isPressed && styles.createButtonPressed,
          ]}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          onPress={createGroupChat}
        >
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* success bubble (shows up if groupCreatedMessage is non-empty),
          placed BELOW the card */}
      {groupCreatedMessage !== "" && (
        <View style={styles.successBubble}>
          <Text style={styles.successText}>{groupCreatedMessage}</Text>
        </View>
      )}
    </View>
  );
};

export default GroupChat;

const styles = StyleSheet.create({
  // comments in lowercase
  container: {
    flex: 1,
    backgroundColor: colors.yuck,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    backgroundColor: colors.yuck,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  backArrowWrapper: {
    marginLeft: 10, // left margin
  },
  header: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#143e52",
    margin: 20,
    borderRadius: 8,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 5,
    marginTop: 10,
  },
  groupInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#fff",
  },
  groupInputError: {
    borderColor: "red",
  },
  noFriendsText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 15,
    marginBottom: 10,
  },
  scrollArea: {
    maxHeight: 200,
    marginVertical: 10,
  },
  friendRow: {
    backgroundColor: "#114b68",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  friendRowSelected: {
    backgroundColor: "#d4a017",
  },
  friendName: {
    color: "#fff",
  },
  errorBubble: {
    backgroundColor: "#7b1d1d",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  errorText: {
    color: "#ffdddd",
    fontSize: 14,
    fontWeight: "bold",
  },
  createButton: {
    backgroundColor: "#d4a017", // yellow
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  createButtonPressed: {
    backgroundColor: "#2ecc71", // bright green
  },
  createButtonText: {
    textAlign: "center",
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
  successBubble: {
    backgroundColor: "#0f5132",
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 20,
    borderRadius: 8,
  },
  successText: {
    color: "#d1e7dd",
    fontSize: 16,
    fontWeight: "bold",
  },
});
