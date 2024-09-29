import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Editor from "@monaco-editor/react";
import styled from 'styled-components';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background-color: #1e1e1e;
  color: #d4d4d4;
`;

const Header = styled.h1`
  text-align: center;
  color: #d4d4d4;
`;

const RoomContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
`;

const Input = styled.input`
  padding: 10px;
  margin-right: 10px;
  border: 1px solid #454545;
  border-radius: 4px;
  background-color: #3c3c3c;
  color: #d4d4d4;
`;

const Button = styled.button`
  padding: 10px 20px;
  background-color: #0e639c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 5px;
  &:hover {
    background-color: #1177bb;
  }
`;

const EditorContainer = styled.div`
  display: flex;
  flex-grow: 1;
`;

const MonacoEditorWrapper = styled.div`
  flex: 1;
  border: 1px solid #454545;
  border-radius: 4px;
`;

const CompileContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 40%;
  margin-left: 20px;
`;

const CompileButton = styled(Button)`
  margin-bottom: 10px;
`;

const CompileResult = styled.div`
  flex-grow: 1;
  border: 1px solid #454545;
  border-radius: 4px;
  padding: 10px;
  background-color: #252526;
  overflow-y: auto;
  font-family: monospace;
  white-space: pre-wrap;
`;

// const socket: Socket = io('https://collaborative-code-editor-lilac.vercel.app');
const socket: Socket = io('https://collaborative-code-editor-lilac.vercel.app', {
  withCredentials: true,
  transports: ['websocket', 'polling'],
});

function App() {
  const [code, setCode] = useState('// Start coding here');
  const [roomId, setRoomId] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [compileResult, setCompileResult] = useState('');

  useEffect(() => {
    socket.on('codeUpdate', (updatedCode: string) => {
      setCode(updatedCode);
    });

    socket.on('compileResult', (result: string | { error: string }) => {
      if (typeof result === 'string') {
        setCompileResult(result);
      } else {
        setCompileResult(`Error: ${result.error}`);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
    });

    return () => {
      socket.off('codeUpdate');
      socket.off('compileResult');
    };
  }, []);

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(7);
    setRoomId(newRoomId);
    socket.emit('createRoom', newRoomId);
    setIsInRoom(true);
  };

  const handleJoinRoom = () => {
    if (roomId) {
      socket.emit('joinRoom', roomId);
      setIsInRoom(true);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && isInRoom) {
      setCode(value);
      socket.emit('codeChange', { roomId, code: value });
    }
  };

  const handleCompile = () => {
    if (isInRoom) {
      socket.emit('compile', { roomId, code });
    }
  };

  return (
    <AppContainer>
      <Header>Collaborative Code Editor</Header>
      {!isInRoom ? (
        <RoomContainer>
          <Input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
          />
          <Button onClick={handleJoinRoom}>Join Room</Button>
          <Button onClick={handleCreateRoom}>Create Room</Button>
        </RoomContainer>
      ) : (
        <RoomContainer>
          <p>Current Room: {roomId}</p>
        </RoomContainer>
      )}
      <EditorContainer>
        <MonacoEditorWrapper>
          <Editor
            height="100%"
            defaultLanguage="javascript"
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
            }}
          />
        </MonacoEditorWrapper>
        <CompileContainer>
          <CompileButton onClick={handleCompile}>Compile</CompileButton>
          <CompileResult>{compileResult}</CompileResult>
        </CompileContainer>
      </EditorContainer>
    </AppContainer>
  );
}

export default App;
