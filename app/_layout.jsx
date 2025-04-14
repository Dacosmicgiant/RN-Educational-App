import { Stack } from "expo-router";
import {useFonts} from "expo-font"
import { UserDetailContext } from './../context/UserDetailContext';
import { useState } from "react";

export default function RootLayout() {

  useFonts({
    'winky': require('./../assets/fonts/WinkyRough-Regular.ttf'),
    'winky-bold': require('./../assets/fonts/WinkyRough-Bold.ttf')
  })

  const [userDetail, setUserDetail] = useState();
  return (
    <UserDetailContext.Provider value = {{userDetail, setUserDetail}}>    
    <Stack screenOptions={{
      headerShown:false
    }}>

    </Stack>
    </UserDetailContext.Provider>
  )
}
