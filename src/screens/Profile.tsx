// screens/Profile.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
} from "react-native";
import { ref, onValue, set, remove, push, get } from "firebase/database";
import { auth, database } from "../firebase";
import { FontAwesome5 } from "@expo/vector-icons";
import colors from "../../constants/colors";

interface DBUser {
  username: string;
  uid: string;
}

interface FriendRequest {
  fromUid: string;
  fromUsername: string;
  key: string;
}

/*
  Additional DB structure for no-duplicate-requests logic:
  outgoingRequests/<myUid>/<theirUid> = true
*/

const Profile = ({ navigation }: any) => {
  const currentUser = auth.currentUser;

  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<DBUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DBUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<DBUser[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]); // local memory

  // store all outgoing requests from DB
  const [outgoingRequests, setOutgoingRequests] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!currentUser) return;

    // watch outgoingRequests/<myUid>
    const outRef = ref(database, `outgoingRequests/${currentUser.uid}`);
    const unsub = onValue(outRef, (snapshot) => {
      if (!snapshot.exists()) {
        setOutgoingRequests(new Set());
      } else {
        const data = snapshot.val();
        // data is { theirUid: true, ... }
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
      // friendData => { friendUid: friendUsername, ... }
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

  // 3) unify the logic: whenever allUsers or user/friend data changes, we do an updated filter
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
      if (user.uid === myUid) return false; // exclude me
      if (friendUids.has(user.uid)) return false; // exclude existing friend
      if (outgoingRequests.has(user.uid)) return false; // exclude if I've sent request
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
    // friendRequests/<targetUid>
    const targetRef = ref(database, `friendRequests/${targetUser.uid}`);
    const newReqRef = push(targetRef);

    const requestData = {
      fromUid: currentUser.uid,
      fromUsername: currentUsername,
    };
    await set(newReqRef, requestData);

    // also mark outgoingRequests/<myUid>/<theirUid> = true
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

    // skip if it's me or already friends or an outgoing request
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

    // add to each other's friend list
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
      `Are you sure you want to remove ${friendUsername} as your friend?`,
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

    // also remove outgoingRequests
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

  // render the user rows in the "Add Friends" section
  const renderSearchResult = ({ item }: { item: DBUser }) => {
    if (!currentUser) return null;
    const isMe = item.uid === currentUser.uid;
    const isFriend = isAlreadyFriend(item.uid);
    const hasSent = sentRequests.includes(item.uid);
    const hasOutgoing = outgoingRequests.has(item.uid);

    return (
      <View style={styles.userRow}>
        <Text style={styles.username}>{item.username}</Text>
        {isMe ? (
          <Text style={styles.statusText}>This is you</Text>
        ) : isFriend ? (
          <Text style={styles.statusText}>Friend</Text>
        ) : hasOutgoing ? (
          <Text style={styles.statusText}>Request Sent</Text>
        ) : hasSent ? (
          <Text style={styles.statusText}>Request Sent</Text>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => handleAddFriendPress(item)}
          >
            <Text style={styles.buttonText}>Add Friend</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* header with a YELLOW back arrow and "User Profile" in center */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <FontAwesome5
            name="arrow-left"
            size={24}
            color={colors.yellow}
            style={{ marginRight: 10 }}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Profile</Text>
        <View style={{ width: 24, marginLeft: 10 }} />
      </View>

      {/* top 40%: add friends + search */}
      <View style={styles.topContainer}>
        <Text style={styles.sectionTitle}>Add Friends</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor="#ccc"
          value={searchTerm}
          onChangeText={handleSearch}
        />
        <View style={{ flex: 1 }}>
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.uid}
            renderItem={renderSearchResult}
          />
        </View>
      </View>

      {/* middle 25%: friend requests */}
      <View style={styles.middleContainer}>
        <Text style={styles.sectionHeader}>Friend Requests</Text>
        <ScrollView>
          {friendRequests.length === 0 ? (
            <Text style={styles.noItems}>No friend requests.</Text>
          ) : (
            friendRequests.map((req) => (
              <View style={styles.userRow} key={req.key}>
                <Text style={styles.username}>{req.fromUsername}</Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => acceptFriendRequest(req)}
                >
                  <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => rejectFriendRequest(req)}
                >
                  <Text style={styles.buttonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* bottom 35%: my friends */}
      <View style={styles.bottomContainer}>
        <Text style={styles.sectionHeader}>My Friends</Text>
        <ScrollView>
          {friends.length === 0 ? (
            <Text style={styles.noItems}>No friends yet.</Text>
          ) : (
            friends.map((fr) => (
              <View style={styles.userRow} key={fr.uid}>
                <Text style={styles.username}>{fr.username}</Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => DMFriend(fr.uid, fr.username)}
                >
                  <Text style={styles.buttonText}>DM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: "red" }]}
                  onPress={() => confirmRemoveFriend(fr.uid, fr.username)}
                >
                  <Text style={styles.buttonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#5c540b",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: "#5c540b",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 20, // match Global Chat sizing
    fontWeight: "bold",
  },
  topContainer: {
    height: "40%",
    paddingHorizontal: 10,
    paddingTop: 20,
  },
  middleContainer: {
    height: "25%",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingHorizontal: 10,
  },
  bottomContainer: {
    height: "35%",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingHorizontal: 10,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 5,
    fontWeight: "bold",
    // remove underline
  },
  searchInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: "#fff",
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 5,
    fontWeight: "bold",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  username: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
  statusText: {
    color: "#ddd",
    marginLeft: 10,
  },
  button: {
    backgroundColor: "#d4a017",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 10,
  },
  buttonText: {
    color: "#000",
    fontWeight: "bold",
  },
  noItems: {
    color: "#ccc",
    fontStyle: "italic",
    marginVertical: 5,
  },
});
