class TestPageState {
	state = $state<{ editing?: unknown; deleting?: unknown }>({});

	reset() {
		this.state = {};
	}

	setState(newState: Record<string, unknown>) {
		this.state = { ...this.state, ...newState };
	}
}

export const testPageState = new TestPageState();
