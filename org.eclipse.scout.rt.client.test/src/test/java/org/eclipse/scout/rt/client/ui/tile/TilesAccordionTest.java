/*******************************************************************************
 * Copyright (c) 2017 BSI Business Systems Integration AG.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     BSI Business Systems Integration AG - initial API and implementation
 ******************************************************************************/
package org.eclipse.scout.rt.client.ui.tile;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

import org.eclipse.scout.rt.client.testenvironment.TestEnvironmentClientSession;
import org.eclipse.scout.rt.client.ui.group.AbstractGroup;
import org.eclipse.scout.rt.client.ui.group.IGroup;
import org.eclipse.scout.rt.client.ui.tile.AbstractTilesAccordion.DefaultComparator;
import org.eclipse.scout.rt.platform.classid.ClassId;
import org.eclipse.scout.rt.platform.util.StringUtility;
import org.eclipse.scout.rt.testing.client.runner.ClientTestRunner;
import org.eclipse.scout.rt.testing.client.runner.RunWithClientSession;
import org.eclipse.scout.rt.testing.platform.runner.RunWithSubject;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(ClientTestRunner.class)
@RunWithSubject("default")
@RunWithClientSession(TestEnvironmentClientSession.class)
public class TilesAccordionTest {

  @Test
  public void testAddTileToDefaultGroup() {
    P_Accordion accordion = new P_Accordion();
    P_Tile tile = new P_Tile();

    accordion.addTile(tile);
    assertEquals(1, accordion.getTileCount());
    assertTrue(accordion.getGroupManager() instanceof DefaultGroupManager);
    assertEquals(1, accordion.getGroupCount());
    assertEquals(DefaultGroupManager.GROUP_ID_DEFAULT, accordion.getDefaultGroup().getGroupId());
    assertEquals(accordion.getDefaultGroup(), accordion.getGroupByTile(tile));

    // Adding another tile for the default group does not create another group
    P_Tile tile2 = new P_Tile();
    accordion.addTile(tile2);
    assertEquals(2, accordion.getTileCount());
    assertEquals(1, accordion.getGroupCount());
    assertEquals(accordion.getDefaultGroup(), accordion.getGroupByTile(tile2));
  }

  @Test
  public void testDeleteTile() {
    P_Accordion accordion = new P_Accordion();
    P_Tile tile = new P_Tile();

    accordion.addTile(tile);
    assertEquals(1, accordion.getTileCount());
    assertEquals(1, accordion.getGroupCount());
    assertEquals(DefaultGroupManager.GROUP_ID_DEFAULT, accordion.getDefaultGroup().getGroupId());
    assertEquals(accordion.getDefaultGroup(), accordion.getGroupByTile(tile));

    // All tiles are deleted but default group is still there
    accordion.deleteTile(tile);
    assertEquals(0, accordion.getTileCount());
    assertTrue(accordion.getGroupManager() instanceof DefaultGroupManager);
    assertEquals(1, accordion.getGroupCount());
    assertEquals(DefaultGroupManager.GROUP_ID_DEFAULT, accordion.getDefaultGroup().getGroupId());
    assertEquals(accordion.getDefaultGroup(), accordion.getGroupByTile(tile));
  }

  @Test
  public void testAddTileCreateGroup() {
    P_Accordion accordion = new P_Accordion();
    accordion.setGroupManager(new P_TileGroupManager());
    assertTrue(accordion.getGroupManager() instanceof P_TileGroupManager);

    P_Tile tile = new P_Tile();
    tile.setGroup("B");

    accordion.addTile(tile);
    assertEquals(1, accordion.getTileCount());
    assertEquals(2, accordion.getGroupCount()); // incl. Default group
    assertEquals("B", accordion.getGroupByTile(tile).getGroupId());
    assertEquals("B", accordion.getGroupByTile(tile).getTitle());

    // Adding another tile for group a must not create another group
    P_Tile tile2 = new P_Tile();
    tile2.setGroup("B");
    accordion.addTile(tile2);
    assertEquals(2, accordion.getTileCount());
    assertEquals(2, accordion.getGroupCount());
    assertEquals("B", accordion.getGroupByTile(tile2).getGroupId());
    assertEquals("B", accordion.getGroupByTile(tile2).getTitle());

    P_Tile tile3 = new P_Tile();
    tile3.setGroup("A");
    accordion.addTile(tile3);
    assertEquals(3, accordion.getTileCount());
    assertEquals(3, accordion.getGroupCount());
    assertEquals("A", accordion.getGroupByTile(tile3).getGroupId());
    assertEquals("A", accordion.getGroupByTile(tile3).getTitle());

    // Groups are not sorted but default group is always the last group
    assertEquals("B", accordion.getGroups().get(0).getTitle());
    assertEquals("A", accordion.getGroups().get(1).getTitle());
    assertEquals(DefaultGroupManager.GROUP_ID_DEFAULT, accordion.getGroups().get(2).getGroupId());
  }

  @Test
  public void testAddTileCreateGroupSorted() {
    P_Accordion accordion = new P_Accordion();
    accordion.setGroupManager(new P_SortingTileGroupManager());
    assertTrue(accordion.getGroupManager() instanceof P_SortingTileGroupManager);

    P_Tile tile = new P_Tile();
    tile.setGroup("B");

    accordion.addTile(tile);
    assertEquals(1, accordion.getTileCount());
    assertEquals(2, accordion.getGroupCount()); // incl. Default group
    assertEquals("B", accordion.getGroupByTile(tile).getGroupId());
    assertEquals("B", accordion.getGroupByTile(tile).getTitle());

    // Adding another tile for group a must not create another group
    P_Tile tile2 = new P_Tile();
    tile2.setGroup("B");
    accordion.addTile(tile2);
    assertEquals(2, accordion.getTileCount());
    assertEquals(2, accordion.getGroupCount());
    assertEquals("B", accordion.getGroupByTile(tile2).getGroupId());
    assertEquals("B", accordion.getGroupByTile(tile2).getTitle());

    P_Tile tile3 = new P_Tile();
    tile3.setGroup("A");
    accordion.addTile(tile3);
    assertEquals(3, accordion.getTileCount());
    assertEquals(3, accordion.getGroupCount());
    assertEquals("A", accordion.getGroupByTile(tile3).getGroupId());
    assertEquals("A", accordion.getGroupByTile(tile3).getTitle());

    assertEquals("A", accordion.getGroups().get(0).getTitle());
    assertEquals("B", accordion.getGroups().get(1).getTitle());
    assertEquals(DefaultGroupManager.GROUP_ID_DEFAULT, accordion.getGroups().get(2).getGroupId());
  }

  @Test
  public void testDeleteTileDeleteGroup() {
    P_Accordion accordion = new P_Accordion();
    accordion.setGroupManager(new P_TileGroupManager());
    assertTrue(accordion.getGroupManager() instanceof P_TileGroupManager);

    P_Tile tile = new P_Tile();
    tile.setGroup("A");

    accordion.addTile(tile);
    assertEquals(1, accordion.getTileCount());
    assertEquals(2, accordion.getGroupCount()); // incl. Default group
    assertEquals("A", accordion.getGroupByTile(tile).getGroupId());

    accordion.deleteTile(tile);
    assertEquals(0, accordion.getTileCount());
    assertEquals(1, accordion.getGroupCount());
  }

  @Test
  public void testSetTilesCreateOrDeleteGroups() {
    P_Accordion accordion = new P_Accordion();
    accordion.setGroupManager(new P_TileGroupManager());
    assertTrue(accordion.getGroupManager() instanceof P_TileGroupManager);

    P_Tile tile = new P_Tile();
    tile.setGroup("A");
    P_Tile tile2 = new P_Tile();
    tile2.setGroup("B");
    List<P_Tile> tiles = Arrays.asList(tile, tile2);

    accordion.setTiles(tiles);
    assertEquals(2, accordion.getTileCount());
    assertEquals(3, accordion.getGroupCount()); // incl. Default group
    assertEquals("A", accordion.getGroupByTile(tile).getGroupId());
    assertEquals("B", accordion.getGroupByTile(tile2).getGroupId());

    P_Tile tile3 = new P_Tile();
    tile3.setGroup("C");
    tiles = Arrays.asList(tile2, tile3);
    accordion.setTiles(tiles);
    assertEquals(2, accordion.getTileCount());
    assertEquals(3, accordion.getGroupCount()); // incl. Default group
    assertEquals("B", accordion.getGroups().get(0).getGroupId());
    assertEquals("C", accordion.getGroups().get(1).getGroupId());
    assertEquals("default", accordion.getGroups().get(2).getGroupId());
    assertEquals("B", accordion.getGroupByTile(tile2).getGroupId());
    assertEquals("C", accordion.getGroupByTile(tile3).getGroupId());
  }

  @Test
  public void testAddTileToStaticGroups() {
    P_Accordion accordion = new P_Accordion();
    accordion.setGroupManager(new P_StaticTileGroupManager());
    assertEquals(0, accordion.getTileCount());
    assertEquals(3, accordion.getGroupCount()); // Default and static groups

    // Add tile to static group
    P_Tile tile = new P_Tile();
    tile.setGroup("Static A");
    accordion.addTile(tile);
    assertEquals(1, accordion.getTileCount());
    assertEquals(3, accordion.getGroupCount());
    assertEquals("Static A", accordion.getGroups().get(0).getGroupId());
    assertEquals("Static B", accordion.getGroups().get(1).getGroupId());
    assertEquals("default", accordion.getGroups().get(2).getGroupId());
    assertEquals("Static A", accordion.getGroupByTile(tile).getGroupId());

    // Create dynamic group by adding a tile which would be assigned to the default group
    P_Tile tile2 = new P_Tile();
    tile2.setGroup("A");
    accordion.addTile(tile2);
    assertEquals(2, accordion.getTileCount());
    assertEquals(4, accordion.getGroupCount()); // Dynamic group added
    assertEquals("Static A", accordion.getGroups().get(0).getGroupId());
    assertEquals("Static B", accordion.getGroups().get(1).getGroupId());
    assertEquals("A", accordion.getGroups().get(2).getGroupId());
    assertEquals("default", accordion.getGroups().get(3).getGroupId());
    assertEquals("Static A", accordion.getGroupByTile(tile).getGroupId());
    assertEquals("A", accordion.getGroupByTile(tile2).getGroupId());

    // Delete tile from static group
    accordion.deleteTile(tile);
    assertEquals(1, accordion.getTileCount());
    assertEquals(4, accordion.getGroupCount()); // Still all groups there
    assertEquals("Static A", accordion.getGroups().get(0).getGroupId());
    assertEquals("Static B", accordion.getGroups().get(1).getGroupId());
    assertEquals("A", accordion.getGroups().get(2).getGroupId());
    assertEquals("default", accordion.getGroups().get(3).getGroupId());
    assertEquals("A", accordion.getGroupByTile(tile2).getGroupId());

    // Delete tile2 from dynamic group
    accordion.deleteTile(tile2);
    assertEquals(0, accordion.getTileCount());
    assertEquals(3, accordion.getGroupCount()); // Dynamic group is deleted, static groups stay
    assertEquals("Static A", accordion.getGroups().get(0).getGroupId());
    assertEquals("Static B", accordion.getGroups().get(1).getGroupId());
    assertEquals("default", accordion.getGroups().get(2).getGroupId());
  }

  @Test
  public void testPreserveProperties() {
    P_Accordion accordion = new P_Accordion();
    accordion.setGroupManager(new P_StaticTileGroupManager());
    assertEquals(3, accordion.getGroupCount()); // Default and static groups
    assertEquals(false, accordion.isSelectable());

    accordion.setSelectable(true);
    assertEquals(true, accordion.getTileGrids().get(0).isSelectable());
    accordion.setSelectable(true);
    assertEquals(true, accordion.getTileGrids().get(1).isSelectable());
    accordion.setSelectable(true);
    assertEquals(true, accordion.getTileGrids().get(2).isSelectable());

    accordion.activateGroupManager(DefaultGroupManager.ID);
    assertEquals(1, accordion.getGroupCount());
    assertEquals(true, accordion.getTileGrids().get(0).isSelectable());
    accordion.setSelectable(true);

    accordion.activateGroupManager(P_StaticTileGroupManager.ID);
    assertEquals(3, accordion.getGroupCount());
    assertEquals(true, accordion.getTileGrids().get(0).isSelectable());
    accordion.setSelectable(true);
    assertEquals(true, accordion.getTileGrids().get(1).isSelectable());
    accordion.setSelectable(true);
    assertEquals(true, accordion.getTileGrids().get(2).isSelectable());
  }

  private static class P_Accordion extends AbstractTilesAccordion<P_Tile> {

    @ClassId("8f9c91d5-0907-4893-9b89-375851a79b1d")
    public class TileGroup extends AbstractGroup {

      @Override
      public Tiles getBody() {
        return (Tiles) super.getBody();
      }

      @ClassId("f87b88b1-0c8b-47b3-95ab-883358a71adc")
      public class Tiles extends AbstractTiles<P_Tile> {

      }

    }
  }

  private static class P_Tile extends AbstractTile {
    private String m_group;

    public String getGroup() {
      return m_group;
    }

    public void setGroup(String group) {
      m_group = group;
    }
  }

  private static class P_TileGroupManager extends AbstractTilesAccordionGroupManager<P_Tile> {

    public static final Object ID = P_TileGroupManager.class;

    @Override
    public Object getGroupIdByTile(P_Tile tile) {
      return tile.getGroup();
    }

    @Override
    public GroupTemplate createGroupForTile(P_Tile tile) {
      return new GroupTemplate(tile.getGroup(), tile.getGroup());
    }

    @Override
    public Object getId() {
      return ID;
    }

  }

  private static class P_SortingTileGroupManager extends AbstractTilesAccordionGroupManager<P_Tile> {

    public static final Object ID = P_SortingTileGroupManager.class;

    @Override
    public Object getGroupIdByTile(P_Tile tile) {
      return tile.getGroup();
    }

    @Override
    public GroupTemplate createGroupForTile(P_Tile tile) {
      return new GroupTemplate(tile.getGroup(), tile.getGroup());
    }

    @Override
    public Object getId() {
      return ID;
    }

    @Override
    public Comparator<IGroup> getComparator() {
      return new P_Comparator();
    }

  }

  private static class P_Comparator implements Comparator<IGroup> {
    private DefaultComparator m_defaultComparator;

    public P_Comparator() {
      m_defaultComparator = new DefaultComparator();
    }

    @Override
    public int compare(IGroup group1, IGroup group2) {
      int result = m_defaultComparator.compare(group1, group2);
      if (result != 0) {
        return result;
      }
      return StringUtility.compare(group1.getTitle(), group2.getTitle());
    }
  }

  private static class P_StaticTileGroupManager extends AbstractTilesAccordionGroupManager<P_Tile> {

    public static final Object ID = P_StaticTileGroupManager.class;

    @Override
    public Object getGroupIdByTile(P_Tile tile) {
      return tile.getGroup();
    }

    @Override
    public List<GroupTemplate> createGroups() {
      List<GroupTemplate> groups = new ArrayList<>();
      groups.add(new GroupTemplate("Static A", "Static A"));
      groups.add(new GroupTemplate("Static B", "Static B"));
      return groups;
    }

    @Override
    public GroupTemplate createGroupForTile(P_Tile tile) {
      return new GroupTemplate(tile.getGroup(), tile.getGroup());
    }

    @Override
    public Object getId() {
      return ID;
    }

  }
}
