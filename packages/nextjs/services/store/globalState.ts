import { createGlobalState } from 'react-hooks-global-state';
const { useGlobalState } = createGlobalState({ userOwnedTokenIds: <bigint[]>[] });
export default useGlobalState;
