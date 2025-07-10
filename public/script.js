const socket = io();
const yourId = document.getElementById('yourId');



function checkConnection() {
  
    socket.on('connect',()=>{
        //console.log('Connected to Server.');
        updateStatus(true);
        setUserIdentity();
    })

    socket.on('disconnect',()=>{
        //console.log('DIsconnected from server');
        updateStatus(false);
    })
} 

function updateStatus(isConnected) {
    const container = document.getElementById('statusCon');
    const statusEl = `<div id="icon-2" class="w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}"></div>
          <div id="status" class="text-md text-gray-900 dark:text-gray-300">${isConnected ? 'Connected' : 'Disconnected'}</div>`;
    container.innerHTML = statusEl;      
}

let ownUsername = null;


function setUserIdentity() {
    let userName = localStorage.getItem('userName');
    if(!userName) {
        userName = 'User' + Math.random().toString(36).substring(2,6);
        localStorage.setItem('userName',userName);
    }
    ownUsername = localStorage.getItem('userName');
    yourId.innerText = 'Your ID : ' + ownUsername;
    let chatColor = localStorage.getItem('chatColor');
    if(!chatColor) {
        const colors = [
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
                '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
                '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE'
            ];
        chatColor = colors[Math.floor(Math.random() * colors.length)];
        localStorage.setItem('chatColor',chatColor);
    }

   

    socket.emit('user_join',{
         name : userName,
         color : chatColor
    });
    
    socket.on('joinMessage',(data)=>{
        //console.log(data.id,'joined the chat.')
    })

    socket.on('users_update',data=>{
        updateUserList(data);
    })
    
}

function updateUserList(users) {
  const connectedUserCon = document.getElementById('connectedUsers');
  connectedUserCon.innerHTML = '';

  users.forEach(user => {
    const userEl = document.createElement('div');
    userEl.className = 'flex items-center justify-between p-2 rounded-xl my-2 bg-gray-100 dark:bg-gray-700';

    const isCurrentUser = user.id === ownUsername;

    const joinedAt = new Date(user.joinedAt);
    const joinedTime = joinedAt.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    userEl.innerHTML = `
      <div class="w-3 h-3 rounded-full" style="background-color: ${user.color}"></div>
      <div class="flex flex-col ml-4 flex-1">
        <span class="font-bold text-gray-900 dark:text-gray-100">${user.id}</span>
        <span class="text-sm text-gray-900 dark:text-gray-500">Joined at ${joinedTime}</span>
      </div>
    `;

    if (isCurrentUser) {
      userEl.classList.add('ring-2', 'ring-blue-500');
    }

    connectedUserCon.appendChild(userEl);
  });
}


    const msgInput = document.getElementById('msgInput');
    const chatBox = document.getElementById('chatBox');
    const msgForm = document.getElementById('msgForm');
    const sendBtn = document.getElementById('sendBtn');

msgForm.addEventListener('submit',sendMsg);
msgInput.addEventListener('input',handleTypingStart);


function sendMsg(e) {
    e.preventDefault();
    const msg = msgInput.value.trim();
    msgInput.value =''
    socket.emit('send_msg',msg);
}

socket.on('add_msg', data => {
  const isOwn = data.userID === ownUsername;

  // Customize system message if it's you who joined
  if (data.userID === "System" && data.msg.includes(`${ownUsername} joined the chat.`)) {
    data.msg = "You joined the chat.";
  }

  addMsg(isOwn, data);
});

function addMsg(isOwn, data) {
  const shouldScroll = isScrolledToBottom(); // ✅ check before adding message

  const time = new Date(data.timestamp || Date.now()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  let msgHtml = '';

  if (data.userID === "System") {
    msgHtml = `
      <div class="text-center text-sm italic text-gray-500 dark:text-gray-400 my-2 animate-inflate">
        ${data.msg} <span class="text-xs opacity-60">(${time})</span>
      </div>`;
  } else {
    msgHtml = `
      <div class="${isOwn ? 'self-end bg-gray-300 text-black' : 'self-start bg-blue-500 text-white'} px-4 py-2 m-2 rounded-t-2xl ${isOwn ? 'rounded-l-2xl' : 'rounded-r-2xl'} max-w-sm lg:max-w-md shadow-md animate-inflate">
        <span class="font-semibold">${data.userID}</span>
        <div class="flex flex-col">
          <span class="text-sm p-1 break-words">${data.msg}</span>
          <span class="text-xs self-end opacity-70">${time}</span>
        </div>
      </div>`;
  }

  chatBox.insertAdjacentHTML('beforeend', msgHtml);

  if (shouldScroll) {
  chatBox.scrollTo({
    top: chatBox.scrollHeight,
    behavior: 'smooth'
  });
}
}

socket.on("chat_history", (history) => {
  history.forEach(msg => {
    const isOwn = msg.userID === ownUsername;
    addMsg(isOwn, msg);
  });
});


function isScrolledToBottom() {
  const threshold = 150;
  const distanceFromBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight;
  return distanceFromBottom <= threshold;
}



let typingTimer = null;
function handleTypingStart() {
    socket.emit('typing_start');
    clearTimeout(typingTimer)
    typingTimer = setTimeout(() => {
        handleTypingStop();
    }, 1000);
}

function handleTypingStop() {
  socket.emit('typing_stop');
  clearTimeout(typingTimer);
}

socket.on('typing_start',(name)=>{
    const feedback = document.getElementById('feedback');
    feedback.innerText = `${name} is typing...`;
    feedback.classList.remove('invisible');
})

socket.on('typing_stop',(name)=>{
    const feedback = document.getElementById('feedback');
    feedback.innerText = `${name} is typing...`;
    feedback.classList.add('invisible');
})


document.addEventListener('DOMContentLoaded', () => {
  checkConnection();
});

