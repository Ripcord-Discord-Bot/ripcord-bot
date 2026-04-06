// Audit logger — registers Discord event listeners and logs server activity
// Covers messages, edits, deletes, members, roles, channels, voice, bans, and reactions

import { Events } from 'discord.js';

export function setupAudit(client, logger) {
  // Message received
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    await logger.info(`[MESSAGE] ${message.author.tag} in #${message.channel.name ?? 'DM'}: ${message.content}`);
  });

  // Message edited
  client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
    if (newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    const old = oldMessage.content || '(uncached)';
    await logger.info(
      `[EDIT] ${newMessage.author?.tag ?? 'Unknown'} in #${newMessage.channel.name}: "${old}" → "${newMessage.content}"`
    );
  });

  // Message deleted
  client.on(Events.MessageDelete, async (message) => {
    if (message.author?.bot) return;
    const content = message.content || '(uncached)';
    await logger.info(
      `[DELETE] Message by ${message.author?.tag ?? 'Unknown'} deleted in #${message.channel.name}: "${content}"`
    );
  });

  // Member joined
  client.on(Events.GuildMemberAdd, async (member) => {
    await logger.info(`[JOIN] ${member.user.tag} (${member.id}) joined ${member.guild.name}`);
  });

  // Member left or was kicked
  client.on(Events.GuildMemberRemove, async (member) => {
    await logger.info(`[LEAVE] ${member.user.tag} (${member.id}) left ${member.guild.name}`);
  });

  // Role awarded or removed
  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));

    for (const role of addedRoles.values()) {
      await logger.info(`[ROLE+] "${role.name}" awarded to ${newMember.user.tag}`);
    }
    for (const role of removedRoles.values()) {
      await logger.info(`[ROLE-] "${role.name}" removed from ${newMember.user.tag}`);
    }

    // Nickname change
    if (oldMember.nickname !== newMember.nickname) {
      await logger.info(
        `[NICK] ${newMember.user.tag} nickname: "${oldMember.nickname ?? 'none'}" → "${newMember.nickname ?? 'none'}"`
      );
    }
  });

  // Member banned
  client.on(Events.GuildBanAdd, async (ban) => {
    await logger.warn(`[BAN] ${ban.user.tag} (${ban.user.id}) was banned from ${ban.guild.name}${ban.reason ? `: ${ban.reason}` : ''}`);
  });

  // Member unbanned
  client.on(Events.GuildBanRemove, async (ban) => {
    await logger.info(`[UNBAN] ${ban.user.tag} (${ban.user.id}) was unbanned from ${ban.guild.name}`);
  });

  // Voice channel join / leave / move
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    const member = newState.member ?? oldState.member;
    if (!member) return;
    const tag = member.user.tag;

    if (!oldState.channelId && newState.channelId) {
      await logger.info(`[VOICE] ${tag} joined voice channel #${newState.channel.name}`);
    } else if (oldState.channelId && !newState.channelId) {
      await logger.info(`[VOICE] ${tag} left voice channel #${oldState.channel.name}`);
    } else if (oldState.channelId !== newState.channelId) {
      await logger.info(`[VOICE] ${tag} moved from #${oldState.channel.name} to #${newState.channel.name}`);
    }
  });

  // Channel created
  client.on(Events.ChannelCreate, async (channel) => {
    await logger.info(`[CHANNEL+] #${channel.name} created in ${channel.guild?.name ?? 'unknown'}`);
  });

  // Channel deleted
  client.on(Events.ChannelDelete, async (channel) => {
    await logger.info(`[CHANNEL-] #${channel.name} deleted from ${channel.guild?.name ?? 'unknown'}`);
  });

  // Channel updated (name, topic, permissions)
  client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
    if (oldChannel.name !== newChannel.name) {
      await logger.info(`[CHANNEL~] #${oldChannel.name} renamed to #${newChannel.name}`);
    }
  });

  // Role created
  client.on(Events.GuildRoleCreate, async (role) => {
    await logger.info(`[ROLE+] Role "${role.name}" created in ${role.guild.name}`);
  });

  // Role deleted
  client.on(Events.GuildRoleDelete, async (role) => {
    await logger.info(`[ROLE-] Role "${role.name}" deleted from ${role.guild.name}`);
  });

  // Role updated (name change)
  client.on(Events.GuildRoleUpdate, async (oldRole, newRole) => {
    if (oldRole.name !== newRole.name) {
      await logger.info(`[ROLE~] Role "${oldRole.name}" renamed to "${newRole.name}"`);
    }
  });

  // Reaction added
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;
    const msg = reaction.message;
    await logger.info(`[REACT+] ${user.tag} reacted ${reaction.emoji.name} to message ${msg.id} in #${msg.channel.name}`);
  });

  // Reaction removed
  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;
    const msg = reaction.message;
    await logger.info(`[REACT-] ${user.tag} removed ${reaction.emoji.name} from message ${msg.id} in #${msg.channel.name}`);
  });
}
