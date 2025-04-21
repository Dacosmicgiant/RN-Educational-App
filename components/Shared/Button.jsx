import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import React from 'react'
import Colors from '../../constants/Colors'

export default function Button({ text, type = 'fill', onPress, loading }) {
  const isFill = type === 'fill';
  const backgroundColor = isFill ? Colors.PRIMARY : Colors.WHITE;
  const textColor = isFill ? Colors.WHITE : Colors.PRIMARY;
  const borderColor = Colors.PRIMARY; // Maintain the border for both types

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 16, // Increased vertical padding for better touch area
        paddingHorizontal: 20, // Added horizontal padding (optional, but good practice)
        width: '100%',
        borderRadius: 25, // Slightly increased border radius for a softer look
        marginTop: 15,
        backgroundColor: backgroundColor,
        borderWidth: 1, // Keep the border for both types
        borderColor: borderColor,
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
      }}
      disabled={loading} // Disable button when loading
      activeOpacity={0.8} // Slightly reduce opacity when pressed
    >

      {!loading ? (
        <Text
          style={{
            textAlign: 'center',
            fontSize: 18, // Font size remains the same
            color: textColor,
            fontFamily: 'winky', // Font family remains the same
            // Add shadow or elevation for better visual hierarchy if needed (optional, depends on platform)
            // shadowColor: "#000",
            // shadowOffset: { width: 0, height: 2 },
            // shadowOpacity: 0.25,
            // shadowRadius: 3.84,
            // elevation: 5,
          }}
        >
          {text}
        </Text>
      ) : (
        <ActivityIndicator
          size="small"
          color={textColor} // Use the text color for the indicator
        />
      )}
    </TouchableOpacity>
  )
}