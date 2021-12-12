declare module 'react-multiRTC-hook' {
    const ReactMultiRTC: ReactMultiRTC

    interface ReactMultiRTC {
        (config: ReactMultiRTCProps): VoidFunction
    }

    interface ReactMultiRTCProps {
        roomDocumentId: string,
        userDocumentId: string
    }

    export default ReactMultiRTC;
}