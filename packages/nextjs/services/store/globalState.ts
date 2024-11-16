import { createGlobalState } from "react-hooks-global-state";

const { useGlobalState } = createGlobalState({ userOwnedTokenIds: [] as bigint[] });
export default useGlobalState;
