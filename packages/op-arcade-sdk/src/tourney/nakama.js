import CONSTANTS from '../constants.js'
import * as nakamajs from '@heroiclabs/nakama-js';

const TEST_ID = "test_id"

const getTourneyProvider = async (options) => {

    // initialize sdk    
     let client = new nakamajs.Client(
        options.key,
        options.url,
        options.port
    )

    // do a test authenticate
    let session = await client.authenticateCustom({
        id: TEST_ID,
        create: true
    });

    if (session != null) {

        let provider = new NakamaTourneyProvider(client);

        console.log('%c%s',
        'color: blue; background: white;',
        "Nakama client SDK initialized: --- " 
        + options.url + ":" + options.port + " ---"
        )
        
        return provider;
    }

    console.error("unable to initialize SDK")
    return null;
}

class NakamaTourneyProvider {

    client = null;
    session = null;
    
    constructor(client) {
        this.client = client;
    }

    refreshSession = async () => {
        if (this.session == null)
        {
            this.session = await this.client.authenticateCustom({
                id: TEST_ID,
                create: true
            }); 
        }

        // if session has expired
        else if ( (this.session.expires_at * 1000) < Date.now())
        {
            // recreate client
            this.client = new nakamajs.Client(
                this.client.serverkey,
                this.client.host,
                this.client.port
            )

            this.session = await this.client.authenticateCustom({
                id: TEST_ID,
                create: true
            }); 

        }

    }


    getTourney = async (options) => {

        try {
            await this.refreshSession();

            let tourneyInfo = await this.client.listLeaderboardRecords(
                this.session,
                options.tourney_id);

            return tourneyInfo;

        } catch (e) {
            console.error("getTourney failed [" + e.status + ":" + e.statusText + "]"); 
            return(e);
         }
    }    
}

export {
    getTourneyProvider
};