require('dotenv').config();

async function updateSubcount(client) {
  try {
    //console.log('updating subcount');

    const response = await fetch(
      'https://im.eps.lol/api/fetchsubcount?id=UC0v4x2DfKjj_oQuEjH2STzg&key=' + process.env.YT_API_KEY
    );

    const data = await response.json();
    const subsFormatted = data.subscriberCount.substring(0, 3) + "k";

    //console.log('Subscriber count:', statistics.subscriberCount);
    try {
      const channel = await client.channels.fetch('1213008110189281320') // dev - 1034565388324851733 // main - 1213008110189281320
      await channel.setName(`Subs: ${subsFormatted}`);
    } catch (error) {
      console.log(`Error updating Subcount : ${error}`)
    }
    
    console.log('Updated TDG Subcount')
  } catch (error) {
    console.error('Error fetching subcount:', error);
  }
}

module.exports = updateSubcount;