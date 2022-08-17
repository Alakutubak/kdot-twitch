import { useState, useEffect } from 'react';
import axios from 'axios';
import intersection from 'lodash/intersection';
import without from 'lodash/without';

import './App.css';

const CLIENT_ID = 'g93ejy6uhy4td05cmsq8ei6ecv9fyk';

function App() {
    const [token, setToken] = useState('');

    useEffect(() => {
        const hash = window.location.hash.substring(1);
        const params = {};
        hash.split('&').forEach((hk) => {
            let temp = hk.split('=');
            params[temp[0]] = temp[1];
        });
        setToken(params.access_token);
    }, []);

    return (
        <div className="App">
            <h1>kdot-twitch</h1>
            {!token && (
                <a
                    href={`https://id.twitch.tv/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${window.location.href.replace(
                        /\/+$/,
                        ''
                    )}&response_type=token`}
                >
                    Connect with Twitch
                </a>
            )}
            {token && <Thing token={token} />}
        </div>
    );
}

function Thing({ token }) {
    const ax = axios.create({
        baseURL: 'https://api.twitch.tv',
    });
    ax.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    ax.defaults.headers.common['Client-Id'] = CLIENT_ID;

    const [user1, setUser1] = useState('fanfan');
    const [user2, setUser2] = useState('joeykaotyk');
    const [inCommon, setInCommon] = useState([]);
    const [different, setDifferent] = useState([]);

    const [isLoading, setIsLoading] = useState(false);

    const userToID = async (username) => {
        const { data } = await ax.get(`/helix/users?login=${username}`);
        if (!data.data.length) {
            alert(`${username} not found`);
            throw new Error(`${username} not found`);
        }
        return data.data[0].id;
    };

    // just dump all these funcs here cause idc
    const getFollowing = async (userID, cursor, result) => {
        if (!result) {
            result = [];
        }
        const { data } = await ax.get(
            `/helix/users/follows?from_id=${userID}&first=100${cursor ? `&after=${cursor}` : ''}`
        );
        result.push(...data.data);
        if (data.pagination.cursor) {
            // just do ugly mutation. forgive me pure zealots
            await getFollowing(userID, data.pagination.cursor, result);
        }
        return result;
    };

    const doTheThing = async () => {
        setIsLoading(true);
        const id1 = await userToID(user1);
        const id2 = await userToID(user2);

        const follows1 = await getFollowing(id1);
        const follows2 = await getFollowing(id2);

        const [common, diff] = getStats(follows1, follows2);
        setInCommon(common);
        setDifferent(diff);
        setIsLoading(false);
    };

    const getStats = (f1, f2) => {
        const justNames1 = f1.map(({ to_name }) => to_name);
        const justNames2 = f2.map(({ to_name }) => to_name);

        const common = intersection(justNames1, justNames2);
        const diff = without([...justNames1, ...justNames2], ...common);

        return [common.sort(), diff.sort()];
    };
    return (
        <>
            <input value={user1} onChange={({ target }) => setUser1(target.value)} type="text" />
            <input value={user2} onChange={({ target }) => setUser2(target.value)} type="text" />
            <button onClick={doTheThing}>Do it</button>

            {isLoading && <div>Loading...</div>}

            {inCommon.length > 0 && (
                <div style={{ textAlign: 'left' }}>
                    <h2>In common</h2>
                    <ol>
                        {inCommon.map((name) => (
                            <li key={name}>{name}</li>
                        ))}
                    </ol>
                    <h2>Difference</h2>
                    <ol>
                        {different.map((name) => (
                            <li key={name}>{name}</li>
                        ))}
                    </ol>
                </div>
            )}
        </>
    );
}

export default App;
