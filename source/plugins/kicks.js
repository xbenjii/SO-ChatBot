module.exports = function (bot) {
    'use strict';

    var kicks = bot.memory.get('kicks');

    bot.IO.register('kick', function (msgObj) {

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
                    target_name: username
                }
            };

            kicks[msgObj.id] = kickObj;
            bot.memory.save('kicks');
    
            if (bot.config.githubKey &&  bot.config.githubKey.length) {
                bot.IO.xhr({
                    method: 'POST',
                    url: 'https://api.github.com/repos/' + bot.config.issueRepo + '/issues',
                    headers: {
                        Authorization: 'token ' + bot.config.githubKey,
                        Accept: 'application/vnd.github.v3+json'
                    },
                    data: JSON.stringify({
                        title: username + ' kicked by ' + kickObj.who.name,
                        body: kickObj.content,
                        labels: ['kick']
                    }),
                    complete: function(response, xhr) {
                        if (xhr.status === 200) {
                            var responseObj = JSON.parse(response);
                            bot.adapter.out.add(username + ' has been kicked by ' + kickObj.who.name + '. An issue has been created [here](' + responseObj.url + ').');
                        }
                        else {
                            bot.adapter.out.add('Something went wrong POSTing to the Github API');
                        }
                    }
                });
            }

        });
    });
};