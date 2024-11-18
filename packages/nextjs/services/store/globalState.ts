import { createGlobalState } from "react-hooks-global-state";

const { useGlobalState } = createGlobalState({
  userOwnedTokenIds: [] as bigint[],
  currentNft: null as any,
});
export default useGlobalState;
