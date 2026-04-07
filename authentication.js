// Authentication - authorization utilities

function isFromChannel(message, channelName) {
  if (!message.channel) return false;
  return message.channel.name === channelName;
}

function hasRole(message, roleName) {
  if (!message.member) return false;
  return message.member.roles.cache.some((role) => role.name === roleName);
}

function hasPermission(message, permissionName) {
  if (!message.member) return false;
  return message.member.permissions.has(permissionName);
}

function isFromTerminal(message) {
  return message.author?.tag === 'terminal';
}

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
