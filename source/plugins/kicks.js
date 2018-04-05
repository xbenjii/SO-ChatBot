module.exports = function (bot) {
    'use strict';

    // Only active in the JS room
    if (bot.adapter.site !== 'stackoverflow' || bot.adapter.roomid !== 17) {
        bot.log('Not activating unformatted code checking; not in right room/site');
        return;
    }

    // Disgusting way of storing the last message ID for the transcript
    var lastMsgId = null;
    bot.IO.register('input', function(msgObj) {
        lastMsgId = msgObj.id;
    });

    var kicks = bot.memory.get('kicks');

    bot.IO.register('kick', function (msgObj) {

        // Message object doesn't contain username of the kickee
        // We need to retrieve it using this method
        bot.users.findUsername(msgObj.target_user_id, function(username) {

            var kickObj = {
                when: msgObj.time_stamp,
                id: msgObj.id,
                room: msgObj.room_id,
                content: msgObj.content,
                who: {
                    id: msgObj.user_id,
                    name: msgObj.user_name,
                    target: msgObj.target_user_id,
                    targetName: username
                }
            };

            kicks[msgObj.id] = kickObj;
            bot.memory.save('kicks');

            if (bot.config.githubKey && bot.config.githubKey.length) {

                var githubBody = kickObj.content;
                if (lastMsgId) {
                    githubBody += '\nhttps://chat.stackoverflow.com/transcript/message/' + lastMsgId;
                }

                bot.IO.xhr({
                    method: 'POST',
                    url: 'https://api.github.com/repos/' + bot.config.issueRepo + '/issues',
                    headers: {
                        Authorization: 'token ' + bot.config.githubKey,
                        Accept: 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify({
                        title: username + ' kicked by ' + kickObj.who.name,
                        body: githubBody,
                        labels: ['kick']
                    }),
                    complete: function(response, xhr) {
                        if (xhr.status === 200) {
                            var responseObj = JSON.parse(response);
                            bot.adapter.out.add([
                                username,
                                'has been kicked by',
                                kickObj.who.name + '.',
                                'An issue has been created',
                                bot.adapter.link('here', responseObj.url) + '.'
                            ].join(' '), msgObj.room_id);
                        }
                        else {
                            bot.adapter.out.add('Something went wrong POSTing to the Github API.', msgObj.room_id);
                            bot.log(xhr, 'github error');
                        }
                    }
                });
            }
        });
    });
};
