declare module 'react-multiRTC-hook' {
    const ReactMultiRTC: ReactMultiRTC

    interface ReactMultiRTC {
        (payload: ReactMultiRTCProps, namespace?: string): VoidFunction
    }

    interface ReactMultiRTCProps {
        roomDocumentId: string,
        userDocumentId: string
    }

    export default ReactMultiRTC;
}