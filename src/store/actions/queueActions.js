// store/actions/queueActions.js
import { setIsLoading } from "../slices/queueSlice";

export const startQueue = () => (dispatch, getState, { socket }) => {
  const user = getState().auth.user;
  if (socket && user?._id) {
    dispatch(setIsLoading(true));
    socket.joinQueue();
  }
};

export const cancelQueue = () => (dispatch, getState, { socket }) => {
  const user = getState().auth.user;
  if (socket && user?._id) {
    dispatch(setIsLoading(false));
    socket.leaveQueue();
  }
};
