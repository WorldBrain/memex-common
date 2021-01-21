import React from "react";
import styled from "styled-components";
import ReactMarkdown from "react-markdown";

export default function Markdown(props: { children: ReactMarkdown.ReactMarkdownProps['children'] }) {
  // Don't render images until a secure solution is agreed on:
  // https://security.stackexchange.com/questions/36447/img-tag-vulnerability
  const imageRenderer = (imageProps: { src: string; alt: string }) => (
    <span>{`![${imageProps.alt}](${imageProps.src})`}</span>
  );

  return (
    <Container>
      <ReactMarkdown linkTarget={'_blank'} renderers={{ image: imageRenderer }} {...props} />
    </Container>
  );
}

const Container = styled.div`
    & h1 {
        font-size: 1.5em
        margin-block-end: 0em;
        margin-bottom: -5px;
    }
    & h2 {
        font-size: 1.3em
        margin-block-end: 0em;
        margin-bottom: -5px;
    }
    & h3 {
        font-size: 1.1em
        margin-block-end: 0em;
        margin-bottom: -5px;
    }
    & h4 {
        margin-block-end: 0em;
        margin-bottom: -5px;
    }
    & blockquote {
        border-left: 4px solid #5cd9a6;
        margin: 0px;
        padding: 5px 5px 5px 15px;
        font-style: italic;
        & p {
            margin: 0px;
        }
    }
    & ul {
        padding-inline-start: 20px;
        margin-top: 10px;
        & ul {
            margin-top: 5px;
        }
    }
    & ol {
        padding-inline-start: 20px;
        margin-top: 10px;
        & ol {
            margin-top: 5px;
        }
    }
    & code {
        padding: 0px 4px;
        border: 1px solid #1d1c1d21;
        border-radius: 3px;
        color: #e01e5a;
        background-color: #1d1c1d04
    }
    & pre {
        padding: 10px;
        color: #3a2f45;
        border: 1px solid #1d1c1d21;
        background-color: #1d1c1d04;
        border-radius: 3px
        & code {
            background-color: transparent;
            color: #3a2f45;
            border: none;
            padding: 0px;
        }
    }
    & hr {
        margin: 20px 0px;
    }
    & img {
        height:
    }
    `;
