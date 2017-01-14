import React, { Component } from 'react';
import {
  AppRegistry,
  TabBarIOS,
  AsyncStorage
} from 'react-native';
import Auth0Lock from 'react-native-lock';
import Map from './components/Map';
import Posts from './components/Posts';
import Settings from './components/Settings';
import Globe from './media/globe_32.png';
import Eye from './media/eye_32.png';
import User from './media/user_32.png';

const lock = new Auth0Lock({
  clientId: 'fluO2A5kqKrUAJ9jc9lUm5DT7Wf5HpBj',
  domain: 'scribemapsapi.auth0.com'
});

export default class Scribe extends Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      location: null,
      selectedTab: 'map',
      userAuth: null,
      username: null,
      promptUN: false
    };

    this.updateLocation = this.updateLocation.bind(this);
    this.getMessages = this.getMessages.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.login = this.login.bind(this);
    this.updatePromptUN = this.updatePromptUN.bind(this);
    this.verifyUsername = this.verifyUsername.bind(this);
  }

  getMessages(cb) {
    if (this.state.location.latitude && this.state.location.longitude) {
      fetch(`http://127.0.0.1:8000/Messages?latitude=${this.state.location.latitude}&longitude=${this.state.location.longitude}`, {
        method: 'GET'
      })
        .then(response => response.json())
        .then((responseData) => {
          if(this.state.username){
            this.getUserVotes(responseData);
          } else {
            responseData.forEach((message, i)=> responseData[i].userVote = null );
            this.setState({ data: responseData });
          }
        })
    }
  }

  getUserVotes(messages){
    if(messages.length){
      fetch(`http://127.0.0.1:8000/votes?displayName=${this.state.username}`, {
          method: 'GET'
      })
      .then(response => response.json())
      .then((votes) => {
        if(votes && this.state.username) {
          for(var i = 0; i < messages.length; i++) {
            for(var j = 0; j < votes.length; j++){
              if(messages[i].id === votes[j].MessageId){
                messages[i].userVote = votes[j].vote;
                break;
              } else {
                messages[i].userVote = null;
              }
            }
          }
        } else {
          for(var i = 0; i < messages.length; i++){
            messages[i].userVote = null;
          }
        }
      })
      .then(() => {
        this.setState({ data: messages });
      });
    }
  }

  verifyUsername(userAuth, username) {
    if (this.state.userAuth) {
      fetch('http://127.0.0.1:8000/users?userAuth=' + userAuth, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      })
      .then(res => {
        if (res.status === 200) {
          return res.json();
        } else {
          return res;
        }
      })
      .then(res => {
        console.log(res);
        if (res.status === 200) {
          this.updateUser(userAuth, res.displayName);
          this.getUserVotes(this.state.data);
        } else {
          if (!username) {
            this.updatePromptUN(true);
          } else {
            console.log(this.state);
            fetch('http://127.0.0.1:8000/users', {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                userAuth: userAuth,
                displayName: username
              })
            })
            .then(res2 => {
              if (res2.status === 201) {
                this.updateUser(userAuth, username);
                this.updatePromptUN(false);
              }
            })
            .catch(err => {
              console.log('POST request err: ', err);
              throw err;
            });
          }
          this.getUserVotes(this.state.data);
        }
      })
      .catch((err, result) => {
        console.log('GET request err: ', err, result);
        throw err;
      });
    } else {
      fetch('http://127.0.0.1:8000/users', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userAuth: userAuth,
          displayName: username
        })
      })
      .then(res => {
        this.updateUser(userAuth, username);
      })
      .then(()=> {})
      .catch(err => {
        console.log('POST request err: ', err);
      });
    }
  }

  updatePromptUN(value) {
    if (this.state.promptUN !== value) {
      this.setState({
        promptUN: value
      });
    }
  }

  updateUser(userAuth, username) {
    if (this.state.promptUN === userAuth) {
      this.setState({
        username: username
      });
    } else {
      this.setState({
        userAuth: userAuth,
        username: username
      });
    }
  }

  updateLocation(currentRegion) {
    this.setState({
      location: currentRegion
    }, this.getMessages);
  }

  login() {
    lock.show({ closable: true }, (err, profile, token) => {
      if (err) {
        console.log(err);
        return;
      }
      let userAuth = profile.userId;
      console.log(userAuth);
      let username = profile.extraInfo.username;
      if(username) {
        this.verifyUsername(userAuth, username);
      } else {
        this.updateUser(userAuth);
        this.verifyUsername(userAuth);
      }
      console.log(this.state);
      AsyncStorage.setItem('id_token', JSON.stringify(token));
    });
  }

  render() {
    return (
      <TabBarIOS
        unselectedTintColor="#000000"
        tintColor="#4b89ed"
        unselectedItemTintColor="#000000"
        barTintColor="white"
        translucent={true}
      >
        <TabBarIOS.Item
          icon={Globe}
          title="Map"
          selected={this.state.selectedTab === 'map'}
          onPress={() => {
            this.setState({
              selectedTab: 'map'
            });
          }}
        >
          <Map
            lock={lock}
            location={this.state.location}
            updateLocation={this.updateLocation}
            updateUser={this.updateUser}
            getMessages={this.getMessages}
            data={this.state.data}
            userAuth={this.state.userAuth}
            login={this.login}
            username={this.state.username}
            promptUN={this.state.promptUN}
            updatePromptUN={this.updatePromptUN}
            verifyUsername={this.verifyUsername}
          />
        </TabBarIOS.Item>
        <TabBarIOS.Item
          icon={Eye}
          title="Posts"
          selected={this.state.selectedTab === 'posts'}
          onPress={() => {
            this.setState({
              selectedTab: 'posts'
            });
          }}
        >
          <Posts
            data={this.state.data}
            location={this.state.location}
            getMessages={this.getMessages}
            username={this.state.username}
            userAuth={this.state.userAuth}
            login={this.login}
          />
        </TabBarIOS.Item>
        <TabBarIOS.Item
          icon={User}
          title="Profile"
          selected={this.state.selectedTab === 'settings'}
          onPress={() => {
            this.setState({
              selectedTab: 'settings'
            });
          }}
        >
          <Settings
            lock={lock}
            userAuth={this.state.userAuth}
            promptUN={this.state.promptUN}
            updateUser={this.updateUser}
            updatePromptUN={this.updatePromptUN}
            login={this.login}
            getMessages={this.getMessages}
            verifyUsername={this.verifyUsername}
          />
        </TabBarIOS.Item>
      </TabBarIOS>
    );
  }
}

AppRegistry.registerComponent('Scribe', () => Scribe);
