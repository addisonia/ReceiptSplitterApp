// src/screens/Profile.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
  SafeAreaView,
} from "react-native";
import { ref, onValue, set, remove, push, get } from "firebase/database";
import { auth, database } from "../firebase";
import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { colors } from "../components/ColorThemes";

/* Enable layout animations on Android */
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DBUser {
  username: string;
  uid: string;
}

interface FriendRequest {
  fromUid: string;
  fromUsername: string;
  key: string;
}

const Profile = ({ navigation }: any) => {
  const { theme, mode } = useTheme();
  const currentUser = auth.currentUser;

  // Collapsible flags
  const [addCollapsed, setAddCollapsed] = useState(false);
  const [requestsCollapsed, setRequestsCollapsed] = useState(false);
  const [friendsCollapsed, setFriendsCollapsed] = useState(false);

  // Call LayoutAnimation whenever toggles happen
  const toggleAddSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAddCollapsed(!addCollapsed);
  };
  const toggleRequestsSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRequestsCollapsed(!requestsCollapsed);
  };
  const toggleFriendsSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFriendsCollapsed(!friendsCollapsed);
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<DBUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DBUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<DBUser[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Set<string>>(
    new Set()
  );

  const isOffWhiteOrDefault = mode === "offWhite" || mode === "default";
  const topTextColor =
    mode === "yuck" || mode === "dark" || mode === "random" ? "#fff" : "#000";

  useEffect(() => {
    if (!currentUser) return;
    const outRef = ref(database, `outgoingRequests/${currentUser.uid}`);
    return onValue(outRef, (snapshot) => {
      if (!snapshot.exists()) {
        setOutgoingRequests(new Set());
      } else {
        const data = snapshot.val();
        const uids = Object.keys(data);
        setOutgoingRequests(new Set(uids));
      }
    });
  }, [currentUser]);

  // Load all known usernames
  useEffect(() => {
    const usersRef = ref(database, "users");
    return onValue(
      usersRef,
      (snapshot) => {
        const data = snapshot.val();
        const userArray: DBUser[] = [];

        if (data) {
          Object.entries(data).forEach(([uid, userData]) => {
            const user = userData as { username?: string };
            if (user.username) {
              userArray.push({ uid, username: user.username });
            }
          });
        }
        setAllUsers(userArray);
      },
      (error) => {
        console.error("Error fetching users:", error);
      }
    );
  }, []);

  // Listen for friend requests and friend list
  useEffect(() => {
    if (!currentUser) return;

    const frRef = ref(database, `friendRequests/${currentUser.uid}`);
    const unsubscribeFR = onValue(frRef, (snapshot) => {
      if (!snapshot.exists()) {
        setFriendRequests([]);
      } else {
        const data = snapshot.val();
        const requests: FriendRequest[] = Object.entries(data).map(
          ([key, val]) => {
            const reqData = val as { fromUid: string; fromUsername: string };
            return {
              key,
              fromUid: reqData.fromUid,
              fromUsername: reqData.fromUsername,
            };
          }
        );
        setFriendRequests(requests);
      }
    });

    const friendsRef = ref(database, `users/${currentUser.uid}/friends`);
    const unsubscribeFriends = onValue(friendsRef, (snap) => {
      if (!snap.exists()) {
        setFriends([]);
      } else {
        const friendData = snap.val();
        const friendList: DBUser[] = Object.entries(friendData).map(
          ([fUid, fUsername]) => ({
            uid: fUid,
            username: typeof fUsername === "string" ? fUsername : "",
          })
        );
        setFriends(friendList);
      }
    });

    return () => {
      unsubscribeFR();
      unsubscribeFriends();
    };
  }, [currentUser]);

  // Filter users
  useEffect(() => {
    if (!currentUser) {
      setFilteredUsers([]);
      return;
    }
    handleSearch(searchTerm);
  }, [allUsers, friends, outgoingRequests, currentUser]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!currentUser) {
      setFilteredUsers([]);
      return;
    }
    const lowerTerm = term.toLowerCase();
    const myUid = currentUser.uid;
    const friendUids = new Set(friends.map((f) => f.uid));

    const results = allUsers.filter((user) => {
      if (user.uid === myUid) return false;
      if (friendUids.has(user.uid)) return false;
      return user.username.toLowerCase().includes(lowerTerm);
    });
    setFilteredUsers(results);
  };

  const getCurrentUserUsername = async (): Promise<string> => {
    if (!currentUser) return "";
    const snap = await get(ref(database, `users/${currentUser.uid}/username`));
    if (snap.exists()) {
      return snap.val();
    }
    return "";
  };

  const sendFriendRequest = async (targetUser: DBUser) => {
    if (!currentUser) return;
    const currentUsername = await getCurrentUserUsername();
    const targetRef = ref(database, `friendRequests/${targetUser.uid}`);
    const newReqRef = push(targetRef);
    await set(newReqRef, {
      fromUid: currentUser.uid,
      fromUsername: currentUsername,
    });

    await set(
      ref(database, `outgoingRequests/${currentUser.uid}/${targetUser.uid}`),
      true
    );
  };

  const isAlreadyFriend = (uid: string) => {
    return friends.some((f) => f.uid === uid);
  };

  const handleAddFriendPress = async (userObj: DBUser) => {
    if (!currentUser) return;
    if (isAlreadyFriend(userObj.uid) || userObj.uid === currentUser.uid) {
      return;
    }
    if (outgoingRequests.has(userObj.uid)) {
      Alert.alert("Already waiting on request");
      return;
    }
    await sendFriendRequest(userObj);
    setSentRequests((prev) => [...prev, userObj.uid]);
  };

  const acceptFriendRequest = async (req: FriendRequest) => {
    if (!currentUser) return;
    const myUid = currentUser.uid;
    const myUsername = await getCurrentUserUsername();

    await set(
      ref(database, `users/${myUid}/friends/${req.fromUid}`),
      req.fromUsername
    );
    await set(
      ref(database, `users/${req.fromUid}/friends/${myUid}`),
      myUsername
    );

    await remove(ref(database, `friendRequests/${myUid}/${req.key}`));
    await remove(ref(database, `outgoingRequests/${req.fromUid}/${myUid}`));
  };

  const rejectFriendRequest = async (req: FriendRequest) => {
    if (!currentUser) return;
    const myUid = currentUser.uid;
    await remove(ref(database, `friendRequests/${myUid}/${req.key}`));
  };

  const confirmRemoveFriend = (friendUid: string, friendUsername: string) => {
    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${friendUsername}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeFriend(friendUid),
        },
      ]
    );
  };

  const removeFriend = async (friendUid: string) => {
    if (!currentUser) return;
    const myUid = currentUser.uid;
    await remove(ref(database, `users/${myUid}/friends/${friendUid}`));
    await remove(ref(database, `users/${friendUid}/friends/${myUid}`));
    await remove(ref(database, `outgoingRequests/${myUid}/${friendUid}`));
    await remove(ref(database, `outgoingRequests/${friendUid}/${myUid}`));
  };

  const DMFriend = (friendUid: string, friendUsername: string) => {
    navigation.navigate("DM", {
      friendUid,
      friendUsername,
    });
  };

  const addSectionStyle: ViewStyle = addCollapsed
    ? { height: 65, overflow: "hidden" }
    : { flex: 1.25 };

  const requestsSectionStyle: ViewStyle = requestsCollapsed
    ? { height: 65, overflow: "hidden" }
    : { flex: 0.75 };

  const friendsSectionStyle: ViewStyle = friendsCollapsed
    ? { height: 65, overflow: "hidden" }
    : { flex: 1 };

  return (
    <SafeAreaView
      style={[styles.flexContainer, { backgroundColor: theme.offWhite2 }]}
    >
      <StatusBar
        barStyle={isOffWhiteOrDefault ? "dark-content" : "light-content"}
        backgroundColor={theme.offWhite2}
      />
      <LinearGradient
        colors={[theme.offWhite2, theme.lightGray2]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5 name="arrow-left" size={20} color={theme.yellow} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: topTextColor }]}>
            My Friends
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.mainContent}>
        <View style={[styles.sectionContainer, addSectionStyle]}>
          <View style={styles.sectionHeaderContainer}>
            <FontAwesome5 name="user-plus" size={16} color={theme.yellow} />
            <Text style={styles.sectionTitle}>Add Friends</Text>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleAddSection}
            >
              <FontAwesome5
                name={addCollapsed ? "chevron-down" : "chevron-up"}
                size={14}
                color={theme.yellow}
              />
            </TouchableOpacity>
          </View>

          {!addCollapsed && (
            <>
              <View style={styles.searchContainer}>
                <FontAwesome5
                  name="search"
                  size={16}
                  color={theme.extraYuckLight}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by username..."
                  placeholderTextColor={theme.extraYuckLight}
                  value={searchTerm}
                  onChangeText={handleSearch}
                />
              </View>

              {filteredUsers.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <FontAwesome5
                    name="users"
                    size={24}
                    color={theme.extraYuckLight}
                  />
                  <Text style={styles.emptyStateText}>
                    {searchTerm ? "No users found" : "Search for users to add"}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredUsers}
                  keyExtractor={(item) => item.uid}
                  renderItem={({ item }) => {
                    const isMe = currentUser
                      ? item.uid === currentUser.uid
                      : false;
                    const isFriend = isAlreadyFriend(item.uid);
                    const hasSent = sentRequests.includes(item.uid);
                    const hasOutgoing = outgoingRequests.has(item.uid);

                    return (
                      <View style={styles.userRow}>
                        <View style={styles.usernameContainer}>
                          <FontAwesome5
                            name="user"
                            size={16}
                            color={theme.extraYuckLight}
                            style={styles.userIcon}
                          />
                          <Text style={styles.username}>{item.username}</Text>
                        </View>
                        {isMe ? (
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>You</Text>
                          </View>
                        ) : isFriend ? (
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: theme.green },
                            ]}
                          >
                            <Text style={styles.statusText}>Friend</Text>
                          </View>
                        ) : hasOutgoing || hasSent ? (
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: theme.orange },
                            ]}
                          >
                            <Text style={styles.statusText}>Pending</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => handleAddFriendPress(item)}
                          >
                            <FontAwesome5
                              name="user-plus"
                              size={14}
                              color={theme.black}
                            />
                            <Text style={styles.buttonText}>Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  }}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </>
          )}
        </View>

        <View style={[styles.sectionContainer, requestsSectionStyle]}>
          <View style={styles.sectionHeaderContainer}>
            <FontAwesome5 name="bell" size={16} color={theme.yellow} />
            <Text style={styles.sectionTitle}>Friend Requests</Text>
            {friendRequests.length > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{friendRequests.length}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleRequestsSection}
            >
              <FontAwesome5
                name={requestsCollapsed ? "chevron-down" : "chevron-up"}
                size={14}
                color={theme.yellow}
              />
            </TouchableOpacity>
          </View>

          {!requestsCollapsed && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {friendRequests.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <FontAwesome5
                    name="inbox"
                    size={24}
                    color={theme.extraYuckLight}
                  />
                  <Text style={styles.emptyStateText}>No friend requests</Text>
                </View>
              ) : (
                friendRequests.map((req) => (
                  <View style={styles.requestRow} key={req.key}>
                    <View style={styles.usernameContainer}>
                      <FontAwesome5
                        name="user-clock"
                        size={16}
                        color={theme.yellow}
                        style={styles.userIcon}
                      />
                      <Text style={styles.username}>{req.fromUsername}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() => acceptFriendRequest(req)}
                      >
                        <FontAwesome5
                          name="check"
                          size={14}
                          color={theme.black}
                        />
                        <Text style={styles.actionButtonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => rejectFriendRequest(req)}
                      >
                        <FontAwesome5
                          name="times"
                          size={14}
                          color={theme.white}
                        />
                        <Text
                          style={[
                            styles.actionButtonText,
                            { color: theme.white },
                          ]}
                        >
                          Reject
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>

        <View style={[styles.sectionContainer, friendsSectionStyle]}>
          <View style={styles.sectionHeaderContainer}>
            <FontAwesome5 name="users" size={16} color={theme.yellow} />
            <Text style={styles.sectionTitle}>My Friends</Text>
            {friends.length > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{friends.length}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleFriendsSection}
            >
              <FontAwesome5
                name={friendsCollapsed ? "chevron-down" : "chevron-up"}
                size={14}
                color={theme.yellow}
              />
            </TouchableOpacity>
          </View>

          {!friendsCollapsed && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {friends.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <FontAwesome5
                    name="user-friends"
                    size={24}
                    color={theme.extraYuckLight}
                  />
                  <Text style={styles.emptyStateText}>No friends yet</Text>
                </View>
              ) : (
                friends.map((friend) => (
                  <View style={styles.friendRow} key={friend.uid}>
                    <View style={styles.usernameContainer}>
                      <FontAwesome5
                        name="user-friends"
                        size={16}
                        color={theme.green}
                        style={styles.userIcon}
                      />
                      <Text style={styles.username}>{friend.username}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.dmButton]}
                        onPress={() => DMFriend(friend.uid, friend.username)}
                      >
                        <FontAwesome5
                          name="comment"
                          size={14}
                          color={theme.black}
                        />
                        <Text style={styles.actionButtonText}>DM</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.removeButton]}
                        onPress={() =>
                          confirmRemoveFriend(friend.uid, friend.username)
                        }
                      >
                        <FontAwesome5
                          name="user-minus"
                          size={14}
                          color={theme.white}
                        />
                        <Text
                          style={[
                            styles.actionButtonText,
                            { color: theme.white },
                          ]}
                        >
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(227, 212, 0, 0.3)",
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(92, 84, 11, 0.6)",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerPlaceholder: {
    width: 40,
  },
  sectionContainer: {
    paddingHorizontal: 15,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(227, 212, 0, 0.2)",
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    marginVertical: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.white,
    fontWeight: "bold",
    marginLeft: 8,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  toggleButton: {
    position: "absolute",
    right: 0,
    padding: 5,
  },
  badgeContainer: {
    backgroundColor: colors.yellow,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(227, 212, 0, 0.3)",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: colors.white,
    fontSize: 16,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  emptyStateText: {
    color: colors.extraYuckLight,
    marginTop: 10,
    fontStyle: "italic",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.yellow,
  },
  usernameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userIcon: {
    marginRight: 8,
  },
  username: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.gray1,
  },
  statusText: {
    color: colors.black,
    fontSize: 12,
    fontWeight: "bold",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.yellow,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  buttonText: {
    color: colors.black,
    fontWeight: "bold",
    fontSize: 14,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "rgba(227, 212, 0, 0.08)",
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.yellow,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "rgba(8, 248, 0, 0.08)",
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: colors.yellow,
  },
  rejectButton: {
    backgroundColor: "rgba(182, 57, 11, 0.9)",
  },
  dmButton: {
    backgroundColor: colors.yellow,
  },
  removeButton: {
    backgroundColor: "rgba(182, 57, 11, 0.9)",
  },
  actionButtonText: {
    color: colors.black,
    fontWeight: "bold",
    fontSize: 14,
  },
});

export default Profile;
