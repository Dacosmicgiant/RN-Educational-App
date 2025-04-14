import { View, Text, TextInput } from 'react-native'
import React, { useState } from 'react'
import Colors from '../../constants/Colors'
import { StyleSheet } from 'react-native'
import Button from './../../components/Shared/Button'
// import { GenerateTopicsAIModel } from '../../config/AiModel'

export default function AddCourse() {
  const [loading, setLoading] = useState(false);
  const [userInput, setUserInput] = useState();
  // const onGenerateTopic = () => {
  //   // get topic idea from AI model

  //   // const PROMPT=userInput+Prompt.IDEA;
  //   // const aiResp=await GenerateTopicsAIModel.sendMessage()
  // }

  return (
    <View style={{
        padding:25,
        backgroundColor: Colors.WHITE,
        flex: 1
    }}>
      <Text style={{
        fontFamily: 'winky-bold',
        fontSize: 30,
        marginTop: 8
      }}>Create New Course</Text>
      <Text style={{
        fontFamily: 'winky',
        marginTop: 8,
        fontSize:26,
      }}>What would you like to learn today?</Text>
      <Text style={{
        fontFamily: 'winky',
        fontSize:20,
        marginTop: 8,
        color: Colors.GRAY
      }}>Create a course (ex. Python, React Native, Digital Marketing, Cetified Personal Trainer, etc.)</Text>

      <TextInput placeholder='(Ex. Python, React Native, Digital Marketing, Cetified Personal Trainer, etc.)' style = {styles.TextInput} numberOfLines={3} multiline={true}
      onChangeText={(value)=>setUserInput(value)}/>

      <Button text={'Generate Topic'}  type='outline' onPress={()=>onGenerateTopic()} loading={loading}/>
    </View>
  )
}

const styles = StyleSheet.create({
  TextInput: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 15,
    marginTop: 10,
    height: 100,
    alignItems: 'flex-start',
    fontSize: 18,
  }
})