---
layout: default
title: Articles
permalink: /articles/
---

{% for post in site.posts %}
  {% if post.category == 'article' %}
    <article class="post">
        <span class="date">{{ post.date | date: "%Y-%m-%d" }}</span>
        <h2>{{ post.title }}</h2>
        {{ post.content }}
    </article>
  {% endif %}
{% endfor %}