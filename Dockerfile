FROM node:slim

LABEL "name"="labeler"
LABEL "maintainer"="GitHub Actions <support+actions@github.com>"
LABEL "version"="1.0.0"

LABEL "com.github.actions.name"="PR Labeller"
LABEL "com.github.actions.description"="An action that labels pull requests according to changed files"
LABEL "com.github.actions.icon"="tag"
LABEL "com.github.actions.color"="orange"

COPY *.md /

COPY package*.json ./

RUN npm ci

COPY entrypoint.js /entrypoint.js

ENTRYPOINT ["node", "/entrypoint.js"]
