const oldNames = {
  handshaking: {
    toServer: {
      handshake: 'set_protocol'
    }
  },
  status: {
    toClient: {
      response: 'server_info',
      pong: 'ping'
    },
    toServer: {
      request: 'ping_start'
    }
  },
  login: {
    toClient: {
      disconnect: 'disconnect',
      encryption_request: 'encryption_begin',
      login_success: 'success',
      set_compression: 'compress'
    },
    toServer: {
      encryption_response: 'encryption_begin'
    }
  },
  play: {
    toClient: {
      join_game: 'login',
      chat_message: 'chat',
      time_update: 'update_time',
      player_position_and_look: 'position',
      held_item_change: 'held_item_slot',
      use_bed: 'bed',
      spawn_player: 'named_entity_spawn',
      collect_item: 'collect',
      spawn_object: 'spawn_entity',
      spawn_mob: 'spawn_entity_living',
      spawn_painting: 'spawn_entity_painting',
      spawn_experience_orb: 'spawn_entity_experience_orb',
      destroy_entities: 'entity_destroy',
      entity_relative_move: 'rel_entity_move',
      entity_look_and_relative_move: 'entity_move_look',
      entity_head_look: 'entity_head_rotation',
      set_experience: 'experience',
      entity_properties: 'entity_update_attributes',
      chunk_data: 'map_chunk',
      effect: 'world_event',
      particle: 'world_particles',
      change_game_state: 'game_state_change',
      spawn_global_entity: 'spawn_entity_weather',
      window_property: 'craft_progress_bar',
      confirm_transaction: 'transaction',
      update_block_entity: 'tile_entity_data',
      open_sign_editor: 'open_sign_entity',
      player_list_item: 'player_info',
      player_abilities: 'abilities',
      update_score: 'scoreboard_score',
      display_scoreboard: 'scoreboard_display_objective',
      plugin_message: 'custom_payload',
      disconnect: 'kick_disconnect',
      server_difficulty: 'difficulty',
      player_list_header_and_footer: 'playerlist_header'
    },
    toServer: {
      chat_message: 'chat',
      player: 'flying',
      player_position: 'position',
      player_look: 'look',
      player_position_and_look: 'position_look',
      player_digging: 'block_dig',
      player_block_placement: 'block_place',
      held_item_change: 'held_item_slot',
      animation: 'arm_animation',
      click_window: 'window_click',
      confirm_transaction: 'transaction',
      creative_inventory_action: 'set_creative_slot',
      player_abilities: 'abilities',
      client_settings: 'settings',
      client_status: 'client_command',
      plugin_message: 'custom_payload',
      resource_pack_status: 'resource_pack_receive'
    }
  }
}

function toSnakeCase (name) {
  return name.split(' ').map(function (word) { return word.toLowerCase() }).join('_')
}

module.exports.transformPacketName = function transformPacketName (packetName, state, direction, id) {
  return module.exports.toOldNames(toSnakeCase(packetName).replace('-', '_').replace(/_\(.+\)$/, ''), state, direction, id)
}

module.exports.toOldNames = function toOldNames (name, state, direction) {
  const x = oldNames[state] && oldNames[state][direction] && oldNames[state][direction][name] ? oldNames[state][direction][name] : name
  return x
}
