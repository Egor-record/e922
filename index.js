require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');

const API_URL = 'https://e922.ru/wp-json/wp/v2/posts';
const FILE_PATH = './posts.json';

async function fetchPostsFromBlog() {
  let posts = [];
  let page = 1;
  while (true) {
    try {
      const response = await axios.get(API_URL + '?per_page=100&page=' + page, {
        timeout: 5000,
      });
      const data = response.data;
      if (data.length === 0) {
        console.log('No more posts to fetch.');
        break;
      }
      posts = posts.concat(data);
      page++;
    } catch (error) {
      if (error.response && error.response.status === 400) {
        break;
      } else {
        console.log('Unexpected error occurred.');
console.log(error)
        break;
      }
    }
  }
  return posts;
}

async function checkForNewPosts() {
    try {
        const postsFromBlog = await fetchPostsFromBlog();
        let previousPosts = [];
        previousPosts = await parseOldJSON()
        if (previousPosts && previousPosts.length === 0) {
          await writeToFile(postsFromBlog);
          return
        } 
        
        const previousPostIds = previousPosts.map(post => post.id);
        const newPosts = postsFromBlog.filter(post => !previousPostIds.includes(post.id));
        if (newPosts.length > 0) {
          const commitMessage = newPosts?.[0]?.title?.rendered ? String(newPosts[0].title.rendered).slice(0, 30) : "No title available";
            try {
              await writeToFile(postsFromBlog);
              await pushChanges(commitMessage);
            } catch (e) {
              console.log(e)
            }

        } else {
            console.log('No new posts found.');
        }
  
    } catch (error) {
       console.log(error)
    }
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function pushChanges(commitMessage) {
  try {
    console.log('Staging changes...');
    await runCommand('git add .');

    console.log('Committing changes...');
    await runCommand(`git commit -m "${commitMessage}"`);

    console.log('Pushing changes...');
    await runCommand('git push');

    console.log('All changes pushed successfully!');
  } catch (error) {
    console.error('Error during Git operations:', error);
  }
}

function parseOldJSON(previousPosts) {
  return new Promise((resolve, reject) => {
    try {
      if (fs.existsSync(FILE_PATH)) {
        const fileContent = fs.readFileSync(FILE_PATH, 'utf-8');
        previousPosts = JSON.parse(fileContent);
        resolve(previousPosts)
      } else {
        resolve([])
      }
      resolve()
    } catch (e) {
      reject([])
    }
  });
}

function writeToFile(data) {
  return new Promise((resolve, reject) => {
    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
      resolve()
    } catch (e) {
      reject(e)
    }
  });
}

checkForNewPosts();

