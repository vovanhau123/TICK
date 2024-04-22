const { promisify } = require("util");
const {
  ChannelType,
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  Partials,
  PermissionFlagsBits,
  ActivityType,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./tickets.db");
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));

const openTickets = new Map();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  presence: {
    activities: [{ name: "ĐỢI ĐỢI", type: ActivityType.Playing }],
    status: "online",
  },
});

const BOT_TOKEN = "";
const ADMIN_ROLE_ID = "1228746521399263262";
const LOG_CHANNEL_ID = "1232049919402184736";
const TARGET_CHANNEL_ID = "1228706074174165082";

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await dbRun(
    "CREATE TABLE IF NOT EXISTS sent_messages (channel_id TEXT PRIMARY KEY, message_id TEXT)"
  );
  const targetChannel = client.channels.cache.get(TARGET_CHANNEL_ID);
  const row = await dbGet(
    "SELECT message_id FROM sent_messages WHERE channel_id = ?",
    TARGET_CHANNEL_ID
  );
  if (!row) {
    if (targetChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle("Vào gang hoặc hỗ trợ? Tạo một vé!")
        .setDescription("Chọn phù hợp nhu cầu của bạn")
        .addFields({
          name: "Cách sử dụng",
          value:
            "**👑XIN VÀO GANG**: Nếu bạn muốn xin chào gang\n\n **👨‍🦯LIÊN HỆ BAN QUẢN LÝ**: Nếu bạn muốn liên hệ, trao đổi với cấp cao.",
        })
        .setImage(
          "https://cdn.discordapp.com/attachments/1231877228074106890/1231989283913601137/MaDaoHoiGIF3.gif?ex=6627d2ee&is=6626816e&hm=fa0cc72ac5f441bd03a6e53328083f79bd5dc6ccc495994ad32ad9a63e30ad76&"
        ) // Replace with your image URL
        .setFooter({
          text: "discord.gg/qJp26dVW",
          iconURL:
            "https://cdn.discordapp.com/icons/1231913035841667142/73eeba4ef1646808dbdce68469b234da.webp?size=96",
        })
        .setTimestamp();
      const openTicketButton = new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("👑 XIN VÀO GANG ")
        .setStyle(ButtonStyle.Primary);
      const ticket2Button = new ButtonBuilder()
        .setCustomId("ticket_2")
        .setLabel("👨‍🦯 LÝ DO LIÊN HỆ QUẢN LÝ ")
        .setStyle(ButtonStyle.Danger);
      const buttonRow = new ActionRowBuilder().addComponents(
        openTicketButton,
        ticket2Button
      );
      const sentMessage = await targetChannel.send({
        embeds: [embed],
        components: [buttonRow],
      });
      await dbRun(
        "INSERT INTO sent_messages (channel_id, message_id) VALUES (?, ?)",
        TARGET_CHANNEL_ID,
        sentMessage.id
      );
    }
  }
});

client.on("messageCreate", async (message) => {
  if (message.channel.name.startsWith("ticket-")) {
    const ticketId = message.channel.id;
    const userId = message.author.id;
    const msgContent = message.content.replace(/'/g, "''");
    const tableName = `messages_${ticketId}`;

    await dbRun(`CREATE TABLE IF NOT EXISTS ${tableName} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                message TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
    await dbRun(`INSERT INTO ${tableName} (user_id, message) VALUES (?, ?)`, [
      userId,
      msgContent,
    ]);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    if (
      interaction.customId === "open_ticket" ||
      interaction.customId === "ticket_2"
    ) {
      const user = interaction.user;
      if (openTickets.has(user.id)) {
        await interaction.reply({
          content:
            "Bạn đã có một vé mở. Vui lòng đóng vé hiện tại của bạn trước khi mở một vé mới.",
          ephemeral: true,
        });
        return;
      }

      const customId =
        interaction.customId === "open_ticket"
          ? "ticket_modal"
          : "ticket_2_modal";
      const title =
        interaction.customId === "open_ticket"
          ? "ĐƠN XIN CHÀO GANG"
          : "LIÊN HỆ BAN QUẢN LÝ";
      const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
      const subjectInput = new TextInputBuilder()
        .setCustomId("subject")
        .setLabel(" Tên + Tên Ig:")
        .setStyle(TextInputStyle.Short);

      let descriptionLabel =
        interaction.customId === "open_ticket"
          ? "Đã vào những gang, ngành, nhóm nào chưa:"
          : "Lý do liên hệ:";
      const descriptionInput = new TextInputBuilder()
        .setCustomId("description")
        .setLabel(descriptionLabel)
        .setStyle(TextInputStyle.Paragraph);

      const actionRows = [new ActionRowBuilder().addComponents(subjectInput)];
      if (interaction.customId === "open_ticket") {
        const extraField1Input = new TextInputBuilder()
          .setCustomId("extra_field_1")
          .setLabel("Đã sở hữu súng , xe gì:")
          .setStyle(TextInputStyle.Short);
        const extraField2Input = new TextInputBuilder()
          .setCustomId("extra_field_2")
          .setLabel("Link Steam + Lv ig:")
          .setStyle(TextInputStyle.Short);
        const extraField3Input = new TextInputBuilder()
          .setCustomId("extra_field_3")
          .setLabel("Thời gian Online:")
          .setStyle(TextInputStyle.Short);
        actionRows.push(new ActionRowBuilder().addComponents(descriptionInput));
        actionRows.push(new ActionRowBuilder().addComponents(extraField1Input));
        actionRows.push(new ActionRowBuilder().addComponents(extraField2Input));
        actionRows.push(new ActionRowBuilder().addComponents(extraField3Input));
      } else {
        actionRows.push(new ActionRowBuilder().addComponents(descriptionInput));
      }

      modal.addComponents(actionRows);
      await interaction.showModal(modal);
    } else if (interaction.customId === "close_ticket") {
      const channel = interaction.channel;
      const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
      if (
        channel.name.startsWith("ticket-") &&
        openTickets.has(interaction.user.id)
      ) {
        await channel.delete();
        openTickets.delete(interaction.user.id);
        await interaction.reply({
          content: "Đã đóng vé thành công.",
          ephemeral: true,
        });
        if (logChannel) {
          logChannel.send(
            `Ticket closed: **${channel.name}** by **${interaction.user.tag}**`
          );
        }
      } else {
        await interaction.reply({
          content: "Bạn không thể đóng vé này.",
          ephemeral: true,
        });
      }
    }
  } else if (interaction.type === InteractionType.ModalSubmit) {
    if (
      interaction.customId === "ticket_modal" ||
      interaction.customId === "ticket_2_modal"
    ) {
      const subject = interaction.fields.getTextInputValue("subject");
      const description = interaction.fields.getTextInputValue("description");
      const channel = await interaction.guild.channels.create({
        name: `ticket-${
          interaction.customId === "ticket_modal" ? "ĐƠN GANG" : "LIÊN HỆ"
        }-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          },
          {
            id: ADMIN_ROLE_ID,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          },
        ],
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Người khởi tạo: ${interaction.user.tag}`)
        .setThumbnail(
          "https://cdn.discordapp.com/attachments/1231877228074106890/1231989283087323317/MaDaHoiKhongNen.png?ex=6627d2ee&is=6626816e&hm=c5de04a409906fb9c86435970377aeb68c94c2a037988a2caad454fc26a1fe76&"
        )
        .addFields({
          name: "Tên + Tên Ig:",
          value: subject || "Không có",
          inline: true,
        });

      if (interaction.customId === "ticket_modal") {
        ticketEmbed.addFields({
          name: "Đã vào những gang, ngành, nhóm nào chưa:",
          value: description || "Không có",
          inline: false,
        });
      } else if (interaction.customId === "ticket_2_modal") {
        ticketEmbed
          .addFields({
            name: "Lý do liên hệ:",
            value: description || "Không có",
            inline: false,
          })
          .setFooter({
            text: "discord.gg/qJp26dVW",
            iconURL:
              "https://cdn.discordapp.com/icons/1231913035841667142/73eeba4ef1646808dbdce68469b234da.webp?size=96",
          })
          .setTimestamp();
      }

      // Include extra fields if it's ticket_modal
      if (interaction.customId === "ticket_modal") {
        const extraField1 =
          interaction.fields.getTextInputValue("extra_field_1");
        const extraField2 =
          interaction.fields.getTextInputValue("extra_field_2");
        const extraField3 =
          interaction.fields.getTextInputValue("extra_field_3");
        ticketEmbed
          .addFields(
            {
              name: "Đã sở hữu súng , xe gì:",
              value: extraField1 || "Không có",
              inline: false,
            },
            {
              name: "Link Steam + Lv ig:",
              value: extraField2 || "Không có",
              inline: false,
            },
            {
              name: "Thời gian Online:",
              value: extraField3 || "Không có",
              inline: false,
            }
          )
          .setFooter({
            text: "discord.gg/qJp26dVW",
            iconURL:
              "https://cdn.discordapp.com/icons/1231913035841667142/73eeba4ef1646808dbdce68469b234da.webp?size=96",
          })
          .setTimestamp();
      }

      const closeButton = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Đóng vé")
        .setStyle(ButtonStyle.Danger);

      await channel.send({
        embeds: [ticketEmbed],
        components: [new ActionRowBuilder().addComponents(closeButton)],
      });
      await interaction.reply({
        content: `Vé của bạn đã được tạo: ${channel}`,
        ephemeral: true,
      });
      openTickets.set(interaction.user.id, channel.id);
    }
  }
});
client.login(BOT_TOKEN);
