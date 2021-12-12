# react-multiRTC-hook

[WebRTC API](https://developer.mozilla.org/ko/docs/Web/API/WebRTC_API)의 1:N 연결을 리액트 커스텀 훅 방식으로 제공하는 플러그인.

복잡한 연결 과정으로 인해 코드가 길어짐에 따라 커스텀 훅으로 만들어 연결 과정을 간소화 했습니다.

## 설치

```shell
npm install react-multiRTC-hook 
//or
yarn add react-multiRTC-hook
```

## 사용법

```js
import React, { useEffect } from 'react';
import useMultiRTC from 'react-multiRTC-hook';

const App = function (props) {
    const { userDocumentId, roomDocumetId } = props // 전역 상태의 값을 가져온다.
    const [ participants, myVideoRef, myStreamRef ] = useMultiRTC({ userDocumentId, roomDocumentId}, 'socketNamespace');
   
    return (
      <div>
        {/* 내 화면 */}
        <video
          ref={myVideoRef}
          stream={myStreamRef.current}
          autoPlay
          muted
          playsInline
        />
        {/* 다른 유저들의 화면 */}
        {participants.map(({ stream }) => (
          <OtherVideo
            key={userDocumentId}
            stream={stream}
          />
        ))}
      </div>
    );
};


const OtherVideo = function (props) {
    const ref = useRef(null);

    useEffect(() => {
      if (!ref.current) return;
      ref.current!.srcObject = stream;
    }, [stream]);

    return (
        <video
          ref={ref}
          autoPlay
          playsInline
        />
    )
}
```

## 설명

```js
import useMultiRTC from 'react-multiRTC-hook';
```

에서 불러온 useMultiRTC 함수를 호출하면 socket.io-client를 사용하여 소켓을 통해 1:N WebRTC 연결을 해줍니다. 

useMultiRTC 함수를 호출하여 얻을 수 있는 값은 
`participants, setParticipants, myVideoRef, socket, myStreamRef`이며 

participants는 나를 제외한 참여자 정보가 담긴 배열을 나타냅니다. 여기서 정보는 stream: MediaStream, userDocumentId, socketId가 담겨져 있습니다.

setParticipants는 participants를 수정해주는 메서드입니다.

myVideoRef는 내 자신의 화면을 보여주기 위해서는 useRef를 통해 video 태그에 연동을 해줘야하기 때문에 useMultiRTC 내부 함수인 useLocalStream를 통해 생성 해줬습니다.

socket은 나의 소켓을 반환해줍니다. 이를 통해 추가적인 socket 이벤트를 설정 할 수 있습니다.

myStreamRef은 나의 MediaStream을 반환해줍니다. MediaStream을 통해 추가적인 동작을 할 수 있습니다.

### PROPS
> useMultiRTC 함수는 2가지의 매개변수가 필요합니다.
> 첫번째 매개변수는 나 자신과 방 번호를 나타내는 매개변수로 반드시 필요하며 
> 두번째 매개변수는 여러개의 소켓 사용을 대비한 namespace 설정입니다. 설정을 안할시 기본 namespace 값으로 설정됩니다.

1. **`userDocumentId (string)`** : 여러명의 유저 중 나 자신을 식별하기 위해 필요합니다.
  
2. **`roomDocumentId (string)`** : 여러개의 방 중 내가 접속한 방을 식별하기 위해 필요합니다.
  
3. **`namespace (?string)`** : 여러개의 소켓 사용을 대비한 namespace 설정입니다. 설정을 안할시 기본 namespace 값으로 설정됩니다.
**`기본값은 ''로 소켓 네임스페이스 기본값으로 설정됩니다.`**
    

### LICENSE

react-multiRTC-hook is [MIT licensed](./LICENSE).