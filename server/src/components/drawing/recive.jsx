import io from 'socket.io-client';
import {useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';


let socket;
export default function Recive(){
	const [url, setUrl] = useState();
	const [myId, setMyId] = useState();
	const {socketId} = useParams();

    const serverUrl = 'http://localhost:4000/';
    useEffect(() => {
    socket = io(serverUrl,{transports: ['websocket']});
    socket.on('connect',() => {
      setMyId(socket.id);
      console.log(socket.id);
      if(socketId){
        socket.emit('getElements',{userId: socketId, myId: socket.id});
      }
    });

    socket.on('revieveElement',({image}) => {
      setUrl(image);
    });

    socket.on('onDraw',({image}) => {
      setUrl(image);
    });

    return () => {
      socket.off();
    }

  },[]);
	return(
			<>
				{
					url &&
					<img src={url} alt='images' style={{width: '100vw',height: '100vh'}}/>
				}
			</>
		)
}