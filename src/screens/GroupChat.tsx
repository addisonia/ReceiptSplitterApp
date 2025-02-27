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
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { ref, onValue, push, set, get, update } from "firebase/database";
import { auth, database } from "../firebase";
import { FontAwesome5 } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Use colors from the theme
const colors = {
  white: "#ffffff",
  offWhite: "#5c540b",
  offWhite2: "#5c540b",
  lightGray: "#7d7a55",
  lightGray2: "#7d7a55",
  yellow: "#e3d400",
  green: "#08f800",
  yuck: "#5c540b",
  yuckLight: "#9e9b7b",
  blood: "rgb(182,57,11)",
  orange: "#de910d",
  gray1: "#a4a4a4",
  black: "#000000",
  textDefault: "#000000",
  extraYuckLight: "#d7d4b5",
};

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
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.yuck} />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5 name="arrow-left" size={20} color={colors.yellow} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group Chat</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Main Content */}
      <View style={styles.contentContainer}>
        {/* Group Name Input */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>GROUP NAME</Text>
          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <View style={styles.inputWrapper}>
              <FontAwesome5 name="users" size={18} color={colors.extraYuckLight} style={styles.inputIcon} />
              <TextInput
                style={[styles.groupInput, !groupName.trim() ? styles.groupInputError : {}]}
                placeholder="My Fun Group"
                placeholderTextColor={colors.extraYuckLight}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>
          </Animated.View>
        </View>

        {/* Friends Selection */}
        <View style={styles.friendsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>SELECT FRIENDS</Text>
            <Text style={styles.selectedCount}>
              {selectedFriends.length} selected
            </Text>
          </View>

          {friends.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <FontAwesome5 name="user-friends" size={40} color={colors.extraYuckLight} />
              <Text style={styles.noFriendsText}>You have no friends yet</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.scrollArea}
              showsVerticalScrollIndicator={false}
            >
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
                    activeOpacity={0.7}
                  >
                    <View style={styles.friendAvatarContainer}>
                      <View style={[
                        styles.friendAvatar,
                        isSelected && styles.friendAvatarSelected
                      ]}>
                        <Text style={styles.friendInitial}>
                          {friend.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.friendName}>{friend.username}</Text>
                    {isSelected && (
                      <FontAwesome5 name="check-circle" size={20} color={colors.yellow} style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Error Message */}
        {errorMessage !== "" && (
          <View style={styles.errorBubble}>
            <FontAwesome5 name="exclamation-circle" size={16} color="#ffdddd" style={styles.errorIcon} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Create Button */}
        <TouchableOpacity
          style={[
            styles.createButton,
            isPressed && styles.createButtonPressed,
            selectedFriends.length < 2 && styles.createButtonDisabled
          ]}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          onPress={createGroupChat}
          activeOpacity={0.8}
        >
          <Text style={styles.createButtonText}>CREATE GROUP</Text>
        </TouchableOpacity>
      </View>

      {/* Success Message */}
      {groupCreatedMessage !== "" && (
        <Animated.View style={styles.successBubble}>
          <FontAwesome5 name="check-circle" size={16} color="#d1e7dd" style={styles.successIcon} />
          <Text style={styles.successText}>{groupCreatedMessage}</Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};

export default GroupChat;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.yuck,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.yuck,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  headerRightPlaceholder: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.extraYuckLight,
    marginBottom: 10,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: {
    marginRight: 10,
  },
  groupInput: {
    flex: 1,
    height: '100%',
    color: colors.white,
    fontSize: 16,
  },
  groupInputError: {
    borderColor: colors.blood,
  },
  friendsSection: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedCount: {
    fontSize: 13,
    color: colors.yellow,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noFriendsText: {
    color: colors.extraYuckLight,
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  friendRowSelected: {
    backgroundColor: 'rgba(227, 212, 0, 0.15)',
    borderColor: colors.yellow,
  },
  friendAvatarContainer: {
    marginRight: 12,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.offWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarSelected: {
    backgroundColor: colors.yellow,
  },
  friendInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  friendName: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 10,
  },
  errorBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(182,57,11,0.2)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(182,57,11,0.3)',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    color: "#ffdddd",
    fontSize: 14,
    fontWeight: "500",
  },
  createButton: {
    backgroundColor: colors.yellow,
    height: 54,
    borderRadius: 12,
    marginTop: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  createButtonPressed: {
    backgroundColor: colors.green,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: colors.black,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  successBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(8,248,0,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(8,248,0,0.3)',
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
});