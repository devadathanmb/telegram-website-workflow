import { Octokit } from '@octokit/rest';
import type { JsonData } from '../types';
import { config } from '../config';

const octokit = new Octokit({ auth: config.githubToken });

export async function fetchJsonFromGitHub(): Promise<JsonData> {
  const { data } = await octokit.repos.getContent({
    owner: config.githubOwner,
    repo: config.githubRepo,
    path: config.jsonPath,
  });
  const content = Buffer.from((data as any).content, 'base64').toString('utf8');
  return JSON.parse(content);
}

export async function updateGitHubFiles(jsonData: JsonData, markdownContent: string): Promise<void> {
  try {
    // Update JSON file
    const { data: jsonFile } = await octokit.repos.getContent({
      owner: config.githubOwner,
      repo: config.githubRepo,
      path: config.jsonPath,
    });

    await octokit.repos.createOrUpdateFileContents({
      owner: config.githubOwner,
      repo: config.githubRepo,
      path: config.jsonPath,
      message: 'Update links data',
      content: Buffer.from(JSON.stringify(jsonData, null, 2)).toString('base64'),
      sha: (jsonFile as any).sha,
    });

    // Update Markdown file
    const { data: mdFile } = await octokit.repos.getContent({
      owner: config.githubOwner,
      repo: config.githubRepo,
      path: config.markdownPath,
    });

    await octokit.repos.createOrUpdateFileContents({
      owner: config.githubOwner,
      repo: config.githubRepo,
      path: config.markdownPath,
      message: 'bot(Bot triggered commit): Update links',
      content: Buffer.from(markdownContent).toString('base64'),
      sha: (mdFile as any).sha,
    });

    console.log('GitHub files updated successfully');
  } catch (error) {
    console.error('Error updating GitHub files:', error);
  }
}
