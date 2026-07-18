"""Development seed data (run with API + DB up, after creating a user with credentials).

This script documents example incidents; actual seeding requires live OpenAI/Pinecone keys.
See README for manual testing with the example scenarios:
- Windows blue screen (usbaudio.sys)
- Epic Games Launcher webcache
- Azure VM SSH / Docker
- n8n Docker restart loop
"""

EXAMPLES = [
    {
        "notes": (
            "Windows blue screen involving usbaudio.sys when I plug in my DS4 controller. "
            "Tried driver reinstall and different USB port. Disabling the audio device helped temporarily."
        ),
        "tags": ["Windows", "DS4", "drivers"],
    },
    {
        "notes": (
            "Epic Games Launcher would not load. Cleared webcache folder and it started working."
        ),
        "tags": ["Windows", "Epic", "launcher"],
    },
]

if __name__ == "__main__":
    print("Example incidents for manual entry in FixVault:")
    for i, ex in enumerate(EXAMPLES, 1):
        print(f"\n--- Example {i} ---")
        print(ex["notes"])
        print("Tags:", ", ".join(ex["tags"]))
