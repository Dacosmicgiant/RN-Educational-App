import { View, Text } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
        headerShown: false
    }}>
        <Tabs.Screen name='home'
        options={{
            tabBarIcon: ({color, size}) =>  <Ionicons name="home-outline" size={size} color="color" />,
            tabBarLabel: 'Home'
        }}
        />
        <Tabs.Screen name='explore'
        options={{
            tabBarIcon: ({color, size}) => <Ionicons name="search-outline" size={24} color="black" />,
            tabBarLabel: 'Explore'
        }}
        />
        <Tabs.Screen name='progress' 
        options={{
            tabBarIcon: ({color, size}) => <Ionicons name="bar-chart-outline" size={24} color="black" />,
            tabBarLabel: 'Progress'
        }}
        />
        <Tabs.Screen name='profile' 
        options={{
            tabBarIcon: ({color, size}) => <Ionicons name="person-outline" size={24} color="black" />,
            tabBarLabel: 'Profile'
        }}
        />        
    </Tabs>
  )
}