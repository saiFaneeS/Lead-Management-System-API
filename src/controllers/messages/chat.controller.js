import { Chat } from "../../models/messages/chat.model.js";
import { Message } from "../../models/messages/message.model.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

const getAllChats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // console.log(id);
  const chats = await Chat.find({ $or: [{ guest: id }, { agent: id }] })
    .populate("agent")
    .populate("guest")
    .populate("lastMessage");

  return res
    .status(200)
    .json(new ApiResponse(200, chats, "Chats fetched successfully."));
});

const getChatById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Please provide a chat id.");
  }

  const chat = await Chat.findById(id).populate("agent").populate("guest");

  const messages = await Message.find({ chat: id }).populate("sender");
  // console.log(chat);
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        chatData: {
          chat,
          messages,
        },
      },
      "Chat and messages fetched Successfully."
    )
  );
});

const registerNewChat = asyncHandler(async (req, res) => {
  const { agentId, guestId, lastMsgId } = req.body;

  if (!agentId || !guestId) {
    throw new ApiError(400, "Please provide both agent and guest Ids.");
  }

  const chat = await Chat.create({
    agent: agentId,
    guest: guestId,
    lastMessage: lastMsgId,
  });

  const populatedChat = await Chat.findById(chat._id)
    .populate("agent")
    .populate("guest")
    .populate("lastMessage");

  return res
    .status(200)
    .json(
      new ApiResponse(200, populatedChat, "New chat registered Successfully.")
    );
});

const deleteChatMessage = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    await Message.findByIdAndDelete(id);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Message deleted successfully."));
  } catch (error) {
    throw new ApiError(500, "Error while deleting message.");
  }
});

const deleteChat = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return;
  }

  try {
    await Message.deleteMany({ chat: { $in: id } });
    await Chat.findByIdAndDelete(id);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `Chat deleted successfully.`));
  } catch (error) {
    throw new ApiError(500, "Could'nt delete chat.");
  }
});

const markMessageRead = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user._id;

  // console.log("chat id: ", chatId)
  // console.log("user id: ", userId)

  // Fetch all messages in the chat
  const messages = await Message.find({ chat: chatId });
  // // Filter messages that haven't been read by the current user
  const unreadMessages = messages.filter(
    (message) => !message.readBy.includes(userId)
  );

  // // Mark unread messages as read by adding the userId to their readBy array
  const updatedMessages = await Promise.all(
    unreadMessages.map(async (message) => {
      message.readBy.push(userId);
      return message.save();
    })
  );

  // console.log("updatedMessages: ", updatedMessages);

  // Return the updated messages and the count of unread messages
  res.json({
    messages: updatedMessages, // You might want to return all messages if you want to show read and unread ones
    unreadCount: unreadMessages.length,
  });
});

export {
  registerNewChat,
  getAllChats,
  getChatById,
  deleteChatMessage,
  deleteChat,
  markMessageRead,
};
