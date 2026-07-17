# Cookbook

## Login policy

```ts
rg.policy("login").limit(10).window("1m").identifier((ctx) => ctx.ip || "anonymous");
```

