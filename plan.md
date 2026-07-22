1. Break down `NetworkSimulator.tsx` into smaller components to improve readability and maintainability.
2. Create subcomponents in `src/components/network-simulator/`:
   - `PolicyController.tsx`: The left panel for managing firewall rules, threat lists, etc.
   - `FlowInjector.tsx`: The right panel for configuring and injecting custom packets.
   - `TopologyPanel.tsx`: The SVG topology and packet animation panel.
   - `PacketInspector.tsx`: The packet inspection detail card.
   - `SyslogTerminal.tsx`: The real-time Syslog terminal box.
3. Keep the core logic (`processPacket`, state management) in `NetworkSimulator.tsx` and pass necessary props to the subcomponents.
4. Verify the application runs correctly with these changes.
5. Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
6. Submit the refactored code.
