import React, { useEffect, useState, useRef } from "react";
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
  Animated,
} from "react-native";
import { ref, onValue, set, remove, push, get } from "firebase/database";
import { auth, database } from "../firebase";
import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// color palette
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
  const currentUser = auth.currentUser;

  // collapsible for ADD FRIENDS
  const [addCollapsed, setAddCollapsed] = useState(false);
  const addAnimatedHeight = useRef(
    new Animated.Value(addCollapsed ? 0 : 35)
  ).current;
  const toggleAddSection = () => {
    Animated.timing(addAnimatedHeight, {
      toValue: addCollapsed ? 35 : 10,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setAddCollapsed(!addCollapsed);
  };

  // collapsible for FRIEND REQUESTS
  const [requestsCollapsed, setRequestsCollapsed] = useState(false);
  const requestsAnimatedHeight = useRef(
    new Animated.Value(requestsCollapsed ? 0 : 25)
  ).current;
  const toggleRequestsSection = () => {
    Animated.timing(requestsAnimatedHeight, {
      toValue: requestsCollapsed ? 25 : 10,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setRequestsCollapsed(!requestsCollapsed);
  };

  // collapsible for MY FRIENDS
  const [friendsCollapsed, setFriendsCollapsed] = useState(false);
  const friendsAnimatedHeight = useRef(
    new Animated.Value(friendsCollapsed ? 0 : 35)
  ).current;
  const toggleFriendsSection = () => {
    Animated.timing(friendsAnimatedHeight, {
      toValue: friendsCollapsed ? 35 : 10,
      duration: 300,
      useNativeDriver: false,
    }).start();
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

  useEffect(() => {
    if (!currentUser) return;
    const outRef = ref(database, `outgoingRequests/${currentUser.uid}`);
    const unsub = onValue(outRef, (snapshot) => {
      if (!snapshot.exists()) {
        setOutgoingRequests(new Set());
      } else {
        const data = snapshot.val();
        const uids = Object.keys(data);
        setOutgoingRequests(new Set(uids));
      }
    });
    return () => unsub();
  }, [currentUser]);

  // 1) load all known usernames
  useEffect(() => {
    const usernamesRef = ref(database, "usernames");
    const unsubscribe = onValue(usernamesRef, (snapshot) => {
      const data = snapshot.val();
      const userArray: DBUser[] = [];
      if (data) {
        Object.entries(data).forEach(([username, uid]) => {
          if (typeof uid === "string") {
            userArray.push({ username, uid });
          }
        });
      }
      setAllUsers(userArray);
    });
    return () => unsubscribe();
  }, []);

  // 2) listen for friend requests + friend list
  useEffect(() => {
    if (!currentUser) return;

    // friend requests to me
    const frRef = ref(database, `friendRequests/${currentUser.uid}`);
    const unsubscribeFR = onValue(frRef, (snapshot) => {
      if (!snapshot.exists()) {
        setFriendRequests([]);
        return;
      }
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
    });

    // my friends
    const friendsRef = ref(database, `users/${currentUser.uid}/friends`);
    const unsubscribeFriends = onValue(friendsRef, (snap) => {
      if (!snap.exists()) {
        setFriends([]);
        return;
      }
      const friendData = snap.val();
      const friendList: DBUser[] = Object.entries(friendData).map(
        ([fUid, fUsername]) => ({
          uid: fUid,
          username: typeof fUsername === "string" ? fUsername : "",
        })
      );
      setFriends(friendList);
    });

    return () => {
      unsubscribeFR();
      unsubscribeFriends();
    };
  }, [currentUser]);

  // 3) unify the logic for filtering
  useEffect(() => {
    if (!currentUser) {
      setFilteredUsers([]);
      return;
    }
    handleSearch(searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUsers, friends, outgoingRequests, currentUser]);

  // filter out me, my friends, my outgoing requests
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
      if (outgoingRequests.has(user.uid)) return false;
      return user.username.toLowerCase().includes(lowerTerm);
    });
    setFilteredUsers(results);
  };

  // fetch my current username
  const getCurrentUserUsername = async (): Promise<string> => {
    if (!currentUser) return "";
    const snap = await get(ref(database, `users/${currentUser.uid}/username`));
    if (snap.exists()) {
      return snap.val();
    }
    return "";
  };

  // send friend request
  const sendFriendRequest = async (targetUser: DBUser) => {
    if (!currentUser) return;
    const currentUsername = await getCurrentUserUsername();
    const targetRef = ref(database, `friendRequests/${targetUser.uid}`);
    const newReqRef = push(targetRef);
    const requestData = {
      fromUid: currentUser.uid,
      fromUsername: currentUsername,
    };
    await set(newReqRef, requestData);

    // also mark outgoingRequests
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

  // accept friend request
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

    // remove request
    await remove(ref(database, `friendRequests/${myUid}/${req.key}`));

    // remove outgoingRequests if it existed
    await remove(ref(database, `outgoingRequests/${req.fromUid}/${myUid}`));
  };

  // reject friend request
  const rejectFriendRequest = async (req: FriendRequest) => {
    if (!currentUser) return;
    const myUid = currentUser.uid;
    await remove(ref(database, `friendRequests/${myUid}/${req.key}`));
  };

  // confirm removing friend
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

  // remove friend
  const removeFriend = async (friendUid: string) => {
    if (!currentUser) return;
    const myUid = currentUser.uid;
    await remove(ref(database, `users/${myUid}/friends/${friendUid}`));
    await remove(ref(database, `users/${friendUid}/friends/${myUid}`));
    await remove(ref(database, `outgoingRequests/${myUid}/${friendUid}`));
    await remove(ref(database, `outgoingRequests/${friendUid}/${myUid}`));
  };

  // open DM
  const DMFriend = (friendUid: string, friendUsername: string) => {
    navigation.navigate("DM", {
      friendUid,
      friendUsername,
    });
  };

  // render user rows for Add Friends
  const renderSearchResult = ({ item }: { item: DBUser }) => {
    if (!currentUser) return null;
    const isMe = item.uid === currentUser.uid;
    const isFriend = isAlreadyFriend(item.uid);
    const hasSent = sentRequests.includes(item.uid);
    const hasOutgoing = outgoingRequests.has(item.uid);

    return (
      <View style={styles.userRow}>
        <View style={styles.usernameContainer}>
          <FontAwesome5
            name="user"
            size={16}
            color="#d7d4b5"
            style={styles.userIcon}
          />
          <Text style={styles.username}>{item.username}</Text>
        </View>
        {isMe ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>You</Text>
          </View>
        ) : isFriend ? (
          <View style={[styles.statusBadge, { backgroundColor: colors.green }]}>
            <Text style={styles.statusText}>Friend</Text>
          </View>
        ) : hasOutgoing || hasSent ? (
          <View
            style={[styles.statusBadge, { backgroundColor: colors.orange }]}
          >
            <Text style={styles.statusText}>Pending</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddFriendPress(item)}
          >
            <FontAwesome5 name="user-plus" size={14} color={colors.black} />
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // render friend requests
  const renderFriendRequest = (req: FriendRequest) => (
    <View style={styles.requestRow} key={req.key}>
      <View style={styles.usernameContainer}>
        <FontAwesome5
          name="user-clock"
          size={16}
          color={colors.yellow}
          style={styles.userIcon}
        />
        <Text style={styles.username}>{req.fromUsername}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => acceptFriendRequest(req)}
        >
          <FontAwesome5 name="check" size={14} color={colors.black} />
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => rejectFriendRequest(req)}
        >
          <FontAwesome5 name="times" size={14} color={colors.white} />
          <Text style={[styles.actionButtonText, { color: colors.white }]}>
            Reject
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // render friends list
  const renderFriend = (friend: DBUser) => (
    <View style={styles.friendRow} key={friend.uid}>
      <View style={styles.usernameContainer}>
        <FontAwesome5
          name="user-friends"
          size={16}
          color={colors.green}
          style={styles.userIcon}
        />
        <Text style={styles.username}>{friend.username}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.dmButton]}
          onPress={() => DMFriend(friend.uid, friend.username)}
        >
          <FontAwesome5 name="comment" size={14} color={colors.black} />
          <Text style={styles.actionButtonText}>DM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.removeButton]}
          onPress={() => confirmRemoveFriend(friend.uid, friend.username)}
        >
          <FontAwesome5 name="user-minus" size={14} color={colors.white} />
          <Text style={[styles.actionButtonText, { color: colors.white }]}>
            Remove
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* gradient background */}
      <LinearGradient
        colors={[colors.yuck, colors.yuckLight]}
        style={styles.background}
      />

      {/* header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <FontAwesome5 name="arrow-left" size={20} color={colors.yellow} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>My Friends</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      {/* top: add friends (collapsible) */}
      <Animated.View
        style={[
          styles.topContainer,
          {
            height: addAnimatedHeight.interpolate({
              inputRange: [0, 35],
              outputRange: ["0%", "35%"],
            }),
          },
        ]}
      >
        <View style={styles.sectionHeaderContainer}>
          <FontAwesome5 name="user-plus" size={16} color={colors.yellow} />
          <Text style={styles.sectionTitle}>Add Friends</Text>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={toggleAddSection}
          >
            <FontAwesome5
              name={addCollapsed ? "chevron-down" : "chevron-up"}
              size={14}
              color={colors.yellow}
            />
          </TouchableOpacity>
        </View>

        {!addCollapsed && (
          <>
            <View style={styles.searchContainer}>
              <FontAwesome5
                name="search"
                size={16}
                color={colors.extraYuckLight}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by username..."
                placeholderTextColor={colors.extraYuckLight}
                value={searchTerm}
                onChangeText={handleSearch}
              />
            </View>

            <View style={styles.resultsContainer}>
              {filteredUsers.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                  <FontAwesome5
                    name="users"
                    size={24}
                    color={colors.extraYuckLight}
                  />
                  <Text style={styles.emptyStateText}>
                    {searchTerm ? "No users found" : "Search for users to add"}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredUsers}
                  keyExtractor={(item) => item.uid}
                  renderItem={renderSearchResult}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </>
        )}
      </Animated.View>

      {/* middle: friend requests (collapsible) */}
      <Animated.View
        style={[
          styles.middleContainer,
          {
            height: requestsAnimatedHeight.interpolate({
              inputRange: [0, 25],
              outputRange: ["0%", "25%"],
            }),
          },
        ]}
      >
        <View style={styles.sectionHeaderContainer}>
          <FontAwesome5 name="bell" size={16} color={colors.yellow} />
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
              color={colors.yellow}
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
                  color={colors.extraYuckLight}
                />
                <Text style={styles.emptyStateText}>No friend requests</Text>
              </View>
            ) : (
              friendRequests.map(renderFriendRequest)
            )}
          </ScrollView>
        )}
      </Animated.View>

      {/* bottom: my friends (collapsible) */}
      <Animated.View
        style={[
          styles.bottomContainer,
          {
            height: friendsAnimatedHeight.interpolate({
              inputRange: [0, 35],
              outputRange: ["0%", "35%"],
            }),
          },
        ]}
      >
        <View style={styles.sectionHeaderContainer}>
          <FontAwesome5 name="users" size={16} color={colors.yellow} />
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
              color={colors.yellow}
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
                  color={colors.extraYuckLight}
                />
                <Text style={styles.emptyStateText}>No friends yet</Text>
              </View>
            ) : (
              friends.map(renderFriend)
            )}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: "rgba(92, 84, 11, 0.9)",
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
    color: colors.white,
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerPlaceholder: {
    width: 40,
  },
  topContainer: {
    // removed fixed height so it can animate
    padding: 15,
    paddingBottom: 5,
    overflow: "hidden",
  },
  middleContainer: {
    padding: 15,
    paddingBottom: 5,
    borderTopWidth: 1,
    borderTopColor: "rgba(227, 212, 0, 0.2)",
    overflow: "hidden",
  },
  bottomContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "rgba(227, 212, 0, 0.2)",
    overflow: "hidden",
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
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
  toggleButton: {
    position: "absolute",
    right: 0,
    padding: 5,
    // added margin to give space above and below the chevron
    marginVertical: 12,
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
  resultsContainer: {
    flex: 1,
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
});

export default Profile;
