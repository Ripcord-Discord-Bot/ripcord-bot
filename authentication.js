// Authentication and authorization utilities for the Discord bot
// Provides functions to verify user permissions and channel access

// Check if a message was sent in a specific channel
// Parameters:
//   message - Discord message object
//   channelName - Name of the channel to check for
// Returns: Boolean - true if message is from the specified channel, false otherwise
function isFromChannel(message, channelName) {
  if (!message.channel) return false;
  return message.channel.name === channelName;
}

// Check if the sender of a message has a specific role
// Parameters:
//   message - Discord message object
//   roleName - Name of the role to check for
// Returns: Boolean - true if sender has the role, false otherwise
function hasRole(message, roleName) {
  // Check if message is from a guild (not a DM)
  if (!message.member) return false;

  // Search for the role in the user's roles
  return message.member.roles.cache.some((role) => role.name === roleName);
}

// Check if the sender has a specific permission
// Parameters:
//   message - Discord message object
//   permissionName - Name of the permission to check for (e.g., 'ManageMessages', 'BanMembers')
// Returns: Boolean - true if sender has the permission, false otherwise
function hasPermission(message, permissionName) {
  if (!message.member) return false;
  return message.member.permissions.has(permissionName);
}

// Check if the message is from the terminal
// Parameters:
//   message - Discord message object
// Returns: Boolean - true if message is from terminal, false otherwise
function isFromTerminal(message) {
  return message.author?.tag === 'terminal';
}

// Check if a message was sent in a specific channel AND sender has a role
// Parameters:
//   message - Discord message object
//   channelName - Name of the channel to check for
//   roleName - Name of the role to check for
// Returns: Boolean - true if both conditions are met, false otherwise
function isFromChannelWithRole(message, channelName, roleName) {
  return isFromChannel(message, channelName) && hasRole(message, roleName);
}

export {
  isFromChannel,
  hasRole,
  hasPermission,
  isFromTerminal,
  isFromChannelWithRole,
};
