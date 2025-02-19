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
import { ref, onValue, set, remove, push } from "firebase/database";
import { auth, database } from "../firebase";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<DBUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<DBUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<DBUser[]>([]);
  const [sentRequests, setSentRequests] = useState<string[]>([]);

  const currentUser = auth.currentUser;

  // 1) Load all known usernames
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
      setFilteredUsers(userArray);
    });
    return () => unsubscribe();
  }, []);

  // 2) Listen for friend requests + friend list
  useEffect(() => {
    if (!currentUser) return;
    const frRef = ref(database, `friendRequests/${currentUser.uid}`);
    const unsubscribeFR = onValue(frRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setFriendRequests([]);
        return;
      }
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

    const friendsRef = ref(database, `users/${currentUser.uid}/friends`);
    const unsubscribeFriends = onValue(friendsRef, (snap) => {
      const friendData = snap.val();
      if (!friendData) {
        setFriends([]);
        return;
      }
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

  // 3) Searching
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const results = allUsers.filter((user) =>
      user.username.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredUsers(results);
  };

  const getCurrentUserUsername = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!currentUser) {
        resolve("");
        return;
      }
      const userRef = ref(database, `users/${currentUser.uid}/username`);
      onValue(
        userRef,
        (snap) => {
          if (snap.exists()) {
            resolve(snap.val());
          } else {
            resolve("");
          }
        },
        { onlyOnce: true }
      );
    });
  };

  // 4) Send friend request
  const sendFriendRequest = async (targetUser: DBUser) => {
    if (!currentUser) return;
    const currentUsername = await getCurrentUserUsername();

    // friendRequests/<targetUid>/<randomKey> = { fromUid, fromUsername }
    const targetRef = ref(database, `friendRequests/${targetUser.uid}`);
    const newReqRef = push(targetRef);

    const requestData = {
      fromUid: currentUser.uid,
      fromUsername: currentUsername,
    };
    await set(newReqRef, requestData);
  };

  const isAlreadyFriend = (uid: string) => friends.some((f) => f.uid === uid);

  const handleAddFriendPress = async (userObj: DBUser) => {
    if (!currentUser) return;
    if (isAlreadyFriend(userObj.uid) || userObj.uid === currentUser.uid) {
      return;
    }
    await sendFriendRequest(userObj);
    setSentRequests((prev) => [...prev, userObj.uid]);
  };

  // 5) Accept friend request
  const acceptFriendRequest = async (req: FriendRequest) => {
    if (!currentUser) return;
    const myUid = currentUser.uid;
    const myUsername = await getCurrentUserUsername();

    // add request sender to your friend list
    await set(
      ref(database, `users/${myUid}/friends/${req.fromUid}`),
      req.fromUsername
    );

    // add yourself to request sender's friend list
    await set(
      ref(database, `users/${req.fromUid}/friends/${myUid}`),
      myUsername
    );

    // remove from friendRequests
    await remove(ref(database, `friendRequests/${myUid}/${req.key}`));
  };

  // 6) Reject friend request
  const rejectFriendRequest = async (req: FriendRequest) => {
    if (!currentUser) return;
    const myUid = currentUser.uid;
    await remove(ref(database, `friendRequests/${myUid}/${req.key}`));
  };

  // 7) Confirm removing friend
  const confirmRemoveFriend = (friendUid: string, friendUsername: string) => {
    Alert.alert(
      "Remove Friend",
      `Are you sure you want to remove ${friendUsername} as your friend?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive", // makes the button red
          onPress: () => removeFriend(friendUid),
        },
      ]
    );
  };

  // 8) Actually remove friend from DB
  const removeFriend = async (friendUid: string) => {
    if (!currentUser) return;
    const myUid = currentUser.uid;

    // remove from my friend list
    await remove(ref(database, `users/${myUid}/friends/${friendUid}`));
    // remove me from their friend list
    await remove(ref(database, `users/${friendUid}/friends/${myUid}`));
  };

  // 9) Go to DM
  const DMFriend = (friendUid: string, friendUsername: string) => {
    navigation.navigate("DM", {
      friendUid,
      friendUsername,
    });
  };

  const renderSearchResult = ({ item }: { item: DBUser }) => {
    if (!currentUser) return null;
    const isMe = item.uid === currentUser.uid;
    const isFriend = isAlreadyFriend(item.uid);
    const hasSent = sentRequests.includes(item.uid);

    return (
      <View style={styles.userRow}>
        <Text style={styles.username}>{item.username}</Text>
        {isMe ? (
          <Text style={styles.statusText}>This is you</Text>
        ) : isFriend ? (
          <Text style={styles.statusText}>Friend</Text>
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
      {/* Top half */}
      <View style={styles.topContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor="#ccc"
          value={searchTerm}
          onChangeText={handleSearch}
        />
        <Text style={styles.sectionTitle}>Add Friends:</Text>
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.uid}
          renderItem={renderSearchResult}
        />
      </View>

      {/* Middle ~16.7% */}
      <View style={styles.middleContainer}>
        <Text style={styles.sectionTitle}>Friend Requests:</Text>
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

      {/* Bottom ~33.3% */}
      <View style={styles.bottomContainer}>
        <Text style={styles.sectionTitle}>My Friends:</Text>
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
  topContainer: {
    height: "50%",
    paddingHorizontal: 10,
    paddingTop: 40,
  },
  middleContainer: {
    height: "16.6667%",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingHorizontal: 10,
  },
  bottomContainer: {
    height: "33.3333%",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingHorizontal: 10,
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
  sectionTitle: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 5,
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
  },
  noItems: {
    color: "#ccc",
    fontStyle: "italic",
    marginVertical: 5,
  },
});
