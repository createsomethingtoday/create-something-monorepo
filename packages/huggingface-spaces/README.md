# HuggingFace Spaces

Public-facing AI tools deployed to HuggingFace Spaces.

## Spaces

### motion-ontology

Phenomenological analysis of CSS animations. Extracts motion patterns and interprets them through Heideggerian ontology.

**Live**: [huggingface.co/spaces/createsomething/motion-ontology](https://huggingface.co/spaces/createsomething/motion-ontology)

### subtractive-triad

Interactive Subtractive Triad audit tool. Analyzes codebases against DRY, Rams, and Heidegger principles.

**Live**: [huggingface.co/spaces/createsomething/subtractive-triad](https://huggingface.co/spaces/createsomething/subtractive-triad)

## Deployment

Each space has its own `hf-deploy/` directory containing the HuggingFace-ready build.

```bash
cd motion-ontology/hf-deploy
git push hf main
```

## Related

- `packages/triad-audit` - Source for subtractive-triad analysis
- `createsomething.space/experiments/motion-ontology` - Interactive experiment
