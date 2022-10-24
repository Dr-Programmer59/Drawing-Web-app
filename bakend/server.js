const http = require('http');
const express = require('express');
const cors = require('cors');
const socketio = require('socket.io');

const port = process.env.PORT || 4000;

const app = express();

app.use(cors());

app.get('/',(req,res) => {
    res.send('server is working');
});

const server = http.createServer(app);

const io = socketio(server);

const users = [{}];

//sockets
io.on('connection', (socket)=>{
  console.log('new connection');
  socket.on('getElements',({userId,myId,userName}) => {
    console.log(userName);
    io.to(userId).emit('getElements',{Id: myId,userName});
  });

  socket.on('sendElements',({myId, elements}) => {
    console.log('elemets',elements);
    io.to(myId).emit('revieveElement',{elements});
  });

  socket.on('onDraw',({userId, data}) => {
    io.to(userId).emit('onDraw',{data});
  });

  socket.on('disconnect',() => {
    console.log('disconnect')
  });

});

server.listen(port,() => {
    console.log(`server is working on ${port}`);
});
