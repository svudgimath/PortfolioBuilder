import {useState, useEffect} from 'react';

export default function UserProfile(){
    const [user, setUser] = useState({});

    useEffect(()=>{
        async function getUserData() {
            const res = await fetch(import.meta.env.BASE_URL + "data.json");
            const data = await res.json();
            setUser(data.profile);
        }
        getUserData();
    },[]);

    return <>

        <div className="heading">
            Hello! I am {user && user.displayName || " "}
        </div>


        {user && user.profileImage && <img src={user.profileImage} alt='Profile Photo'></img> }
        <img src="" alt="" />


        <div className="description">
            {user && user.intro || " "}
        </div>

    </>
}