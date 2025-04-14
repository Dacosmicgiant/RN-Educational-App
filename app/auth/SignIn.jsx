import { View, Text, Image, TextInput, TouchableOpacity, Pressable, ToastAndroid, ActivityIndicator } from 'react-native'
import React, { useContext } from 'react'
import Colors from '../../constants/Colors';
import { StyleSheet } from 'react-native';
import { useRouter } from 'expo-router'
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../config/firebaseConfig';
import { UserDetailContext } from '../../context/UserDetailContext';

export default function SignIn() {
    const router = useRouter()
    const [email, setEmail] = useState();
    const [password, setPassword] = useState();
    const { userDetail, setUserDetail } = useContext(UserDetailContext);
    const [loading, setLoading] = useState(false);

    const onSignInClick = () => {
        setLoading(true)
        signInWithEmailAndPassword(auth, email, password)
            .then(async(resp) => {
                const user = resp.user
                console.log(user)
                await getUserDetail();
                setLoading(false);
            }).catch(e => {
                console.log(e)
                setLoading(false);
                ToastAndroid.show('Incorrect email and password', ToastAndroid.BOTTOM)
            })
    }

    const getUserDetail = async() => {
        const result = await getDoc(doc(db, 'users', email));
        console.log(result.data())
        setUserDetail(result.data())
        // Navigate after successful sign-in
        router.replace('/(tabs)/home'); // Replace with your home route
    }
    
    return (
        <View style={{
            display: 'flex',
            alignItems:'center',
            paddingTop: 100,
            flex: 1,
            backgroundColor: Colors.WHITE,
            padding: 25,
        }}>
            <Image source={require('./../../assets/images/logo.png')}
                style={{
                    width: 180,
                    height: 180,
                    borderRadius: 30,
                }}
            />

            <Text style={{
                marginTop: 20,
                fontSize: 30,
                fontFamily: 'winky-bold'
            }}>Welcome Back!</Text>

            <TextInput 
                placeholder='Email' 
                onChangeText={(value) => setEmail(value)}
                style={styles.TextInput}
            />
            <TextInput 
                placeholder='Password'
                onChangeText={(value) => setPassword(value)}
                secureTextEntry={true} 
                style={styles.TextInput}
            />

            <TouchableOpacity
                onPress={onSignInClick}
                disabled={loading}
                style={{
                    padding: 15,
                    backgroundColor: Colors.PRIMARY,
                    width: '100%',
                    marginTop: 25,
                    borderRadius: 10,
                }}
            >
                {!loading? <Text style={{
                    fontFamily: 'winky',
                    fontSize: 20,
                    color: Colors.WHITE,
                    textAlign: 'center'
                }}>Sign In</Text>:
                <ActivityIndicator size={'small'} color={Colors.WHITE}/>
              }
            </TouchableOpacity>
          

            <View style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 5,
                marginTop: 20
            }}>
                <Text style={{
                    fontFamily: 'winky'
                }}>Don't have an account?</Text>
                <Pressable
                    onPress={() => router.push('/auth/SignUp')}
                >
                    <Text style={{
                        color: Colors.PRIMARY,
                        fontFamily: 'winky-bold'
                    }}>Sign Up</Text>
                </Pressable>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    TextInput: {
        borderWidth: 1,
        width: '100%',
        padding: 15,
        fontSize: 18,
        marginTop: 20,
        borderRadius: 8,
        fontFamily: 'winky',
    }
})