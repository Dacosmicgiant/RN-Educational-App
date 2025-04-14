import { View, Text, Touchable, TouchableOpacity } from 'react-native'
import React from 'react'
import Colors from '../../constants/Colors'

export default function Button({text, type='fill',onPress}) {
  return (
    <TouchableOpacity onPress={onPress} style = {{
        padding: 15,
        width: '100%',
        borderRadius: 15,
        marginTop: 15,
        backgroundColor: type=='fill'?Colors.PRIMARY:Colors.WHITE,
        borderWidth: 1,
        borderColor: Colors.PRIMARY,
    }}>
      <Text style={{
        textAlign: 'center',
        fontSize: 18,
        color:type=='fill'?Colors.WHITE:Colors.PRIMARY,
        fontFamily: 'winky'
      }}>{text}</Text>
    </TouchableOpacity>
  )
}